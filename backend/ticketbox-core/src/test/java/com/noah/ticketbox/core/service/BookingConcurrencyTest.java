package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.common.IdGenerator;
import com.noah.ticketbox.core.domain.Booking;
import com.noah.ticketbox.core.domain.Event;
import com.noah.ticketbox.core.domain.SeatMapFactory;
import com.noah.ticketbox.core.domain.SeatPosition;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.pricing.PricingStrategy;
import com.noah.ticketbox.core.repository.InMemoryRepository;
import com.noah.ticketbox.core.repository.Repository;
import com.noah.ticketbox.core.support.MutableClock;
import com.noah.ticketbox.core.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntPredicate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The most important test of Week 1: proves the per-event lock prevents double booking.
 *
 * <p>All threads wait on a {@link CountDownLatch} and start at the same moment, which maximises
 * contention (without it, early threads would finish before late ones even start).
 */
class BookingConcurrencyTest {

    private static final int THREADS = 100;

    private BookingService bookingService;
    private Event event;

    @BeforeEach
    void setUp() {
        MutableClock clock = MutableClock.startingAt("2026-11-01T00:00:00Z");
        Repository<Event, Long> events = new InMemoryRepository<>();
        Repository<Booking, Long> bookings = new InMemoryRepository<>();
        EventService eventService = new EventService(events, new SeatMapFactory(), new IdGenerator(), clock);
        bookingService = new BookingService(events, bookings, PricingStrategy.seatPrice(),
                new IdGenerator(), clock, Duration.ofMinutes(10));
        event = eventService.create(new CreateEventCommand("Race", "Hall",
                LocalDateTime.of(2026, 12, 1, 20, 0), TestFixtures.smallLayout()));
        eventService.publish(event.id());
    }

    /**
     * "Before" picture: a check-then-act WITHOUT a lock. Even a ConcurrentHashMap does not help,
     * because containsKey + put are two separate operations. Several threads win the same seat.
     * (Probabilistic by nature; the 5 ms "latency" makes the race practically certain.)
     */
    @Test
    void naiveCheckThenAct_soldTheSameSeatSeveralTimes() throws Exception {
        ConcurrentMap<String, String> seatOwner = new ConcurrentHashMap<>();

        int winners = runConcurrently(i -> {
            if (!seatOwner.containsKey("B1")) {      // check
                sleepQuietly(5);                      // e.g. a DB/network call in between
                seatOwner.put("B1", "user-" + i);     // act
                return true;
            }
            return false;
        });

        assertThat(winners).isGreaterThan(1);
    }

    /** Fix #1 (single operation): putIfAbsent is atomic, so exactly one winner. */
    @Test
    void atomicPutIfAbsent_hasExactlyOneWinner() throws Exception {
        ConcurrentMap<String, String> seatOwner = new ConcurrentHashMap<>();

        int winners = runConcurrently(i -> seatOwner.putIfAbsent("B1", "user-" + i) == null);

        assertThat(winners).isEqualTo(1);
    }

    /** Fix #2 (our service): several seats + validation, so we need a lock around the whole block. */
    @Test
    void bookingService_hasExactlyOneWinnerForTheSameSeat() throws Exception {
        List<SeatPosition> seat = List.of(SeatPosition.parse("B1"));

        int winners = runConcurrently(i -> bookingService.tryHold(event.id(), "user-" + i, seat).isSuccess());

        assertThat(winners).isEqualTo(1);
    }

    @Test
    void bookingService_overlappingMultiSeatRequests_neverDoubleBook() throws Exception {
        // Every request wants 2 adjacent seats in row C: (C1,C2), (C2,C3), (C3,C4) ...
        int winners = runConcurrently(i -> {
            int first = 1 + (i % 3);
            List<SeatPosition> pair = List.of(new SeatPosition('C', first), new SeatPosition('C', first + 1));
            return bookingService.tryHold(event.id(), "user-" + i, pair).isSuccess();
        });

        // Row C has 4 seats -> at most 2 non-overlapping pairs.
        assertThat(winners).isBetween(1, 2);
        long heldInRowC = event.seats().stream()
                .filter(s -> s.position().row() == 'C' && s.status() == SeatStatus.HELD)
                .count();
        assertThat(heldInRowC).as("every held seat belongs to exactly one winner").isEqualTo(winners * 2L);
    }

    // ---------------------------------------------------------------------------------------------

    private static int runConcurrently(IntPredicate task) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(THREADS);
        AtomicInteger successes = new AtomicInteger();

        for (int i = 0; i < THREADS; i++) {
            int id = i;
            pool.submit(() -> {
                try {
                    startGate.await();
                    if (task.test(id)) {
                        successes.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        startGate.countDown();                       // release all threads at once
        assertThat(done.await(10, TimeUnit.SECONDS)).isTrue();
        pool.shutdownNow();
        return successes.get();
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
