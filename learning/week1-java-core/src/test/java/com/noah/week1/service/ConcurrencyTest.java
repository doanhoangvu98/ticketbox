package com.noah.week1.service;

import com.noah.week1.domain.Event;
import com.noah.week1.domain.EventStatus;
import com.noah.week1.domain.SeatPosition;
import com.noah.week1.domain.SeatStatus;
import com.noah.week1.exception.BusinessException;
import com.noah.week1.support.TestApp;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntPredicate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Week 1B. Every buyer runs on its own virtual thread and waits at a start gate (CountDownLatch),
 * so all of them hit the shared state at the same moment: maximum contention.
 */
class ConcurrencyTest {

    private static final int BUYERS = 10_000;

    /** The problem: check-then-act without a lock. Even a ConcurrentHashMap does not make two calls atomic. */
    @Test
    void naiveCheckThenAct_sellsTheSameSeatTwice() {
        ConcurrentMap<String, String> owner = new ConcurrentHashMap<>();

        int winners = runConcurrently(1_000, buyer -> {
            if (!owner.containsKey("B1")) {   // check
                pause();                        // e.g. a database call in between
                owner.put("B1", "user-" + buyer); // act
                return true;
            }
            return false;
        });

        assertThat(winners).isGreaterThan(1);
    }

    /** Fix for a single key: one atomic operation instead of two. */
    @Test
    void atomicPutIfAbsent_hasOneWinner() {
        ConcurrentMap<String, String> owner = new ConcurrentHashMap<>();

        int winners = runConcurrently(BUYERS, buyer -> owner.putIfAbsent("B1", "user-" + buyer) == null);

        assertThat(winners).isEqualTo(1);
    }

    /** The real service: several seats and several checks, so the whole block runs under the event lock. */
    @Test
    void orderService_oneWinnerPerSeat() {
        TestApp app = new TestApp();
        Event event = app.publishedEvent();
        List<SeatPosition> seat = List.of(SeatPosition.parse("B1"));

        int winners = runConcurrently(BUYERS, buyer -> tryHold(app, event, "user-" + buyer, seat));

        assertThat(winners).isEqualTo(1);
    }

    @Test
    void overlappingMultiSeatOrders_neverDoubleBook() {
        TestApp app = new TestApp();
        Event event = app.publishedEvent();

        // Everyone wants two adjacent seats in row C: (C1,C2), (C2,C3) or (C3,C4).
        int winners = runConcurrently(BUYERS, buyer -> {
            int first = 1 + buyer % 3;
            return tryHold(app, event, "user-" + buyer,
                    List.of(new SeatPosition('C', first), new SeatPosition('C', first + 1)));
        });

        long held = event.seats().stream()
                .filter(s -> s.position().row() == 'C' && s.status() == SeatStatus.HELD)
                .count();
        assertThat(winners).isBetween(1, 2);
        assertThat(held).isEqualTo(winners * 2L);
    }

    /**
     * publish() and cancel() are check-then-write on the status. Without the lock both can read DRAFT,
     * then cancel writes CANCELLED and publish overwrites it with PUBLISHED. volatile would not prevent that.
     */
    @Test
    void publishAndCancelRace_cancelAlwaysWins() {
        TestApp app = new TestApp();
        for (int round = 0; round < 500; round++) {
            Event event = app.draftEvent();
            AtomicInteger cancelled = new AtomicInteger();

            runConcurrently(2, task -> {
                try {
                    if (task == 0) {
                        app.eventService.publish(event.id());
                    } else {
                        app.eventService.cancel(event.id());
                        cancelled.incrementAndGet();
                    }
                } catch (BusinessException ignored) {
                    // publish after cancel is rejected: that is correct
                }
                return true;
            });

            assertThat(cancelled.get()).isEqualTo(1);
            assertThat(event.status()).isEqualTo(EventStatus.CANCELLED);
        }
    }

    // ---------------------------------------------------------------------------------------------

    private static boolean tryHold(TestApp app, Event event, String user, List<SeatPosition> seats) {
        try {
            app.orderService.hold(event.id(), user, seats);
            return true;
        } catch (BusinessException lost) {
            return false;
        }
    }

    private static int runConcurrently(int tasks, IntPredicate task) {
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger successes = new AtomicInteger();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < tasks; i++) {
                int id = i;
                executor.submit(() -> {
                    startGate.await(); // every task waits here...
                    if (task.test(id)) {
                        successes.incrementAndGet();
                    }
                    return null; // Callable, so await() may throw InterruptedException
                });
            }
            startGate.countDown(); // ...and starts at the same moment
        } // close() waits for all tasks
        return successes.get();
    }

    private static void pause() {
        try {
            Thread.sleep(5);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // keep the interrupt flag for the caller
        }
    }
}
