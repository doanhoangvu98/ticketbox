package com.noah.ticketbox.core.demo;

import com.noah.ticketbox.core.common.IdGenerator;
import com.noah.ticketbox.core.common.Result;
import com.noah.ticketbox.core.domain.*;
import com.noah.ticketbox.core.exception.BusinessException;
import com.noah.ticketbox.core.pricing.PricingStrategy;
import com.noah.ticketbox.core.repository.InMemoryRepository;
import com.noah.ticketbox.core.repository.Repository;
import com.noah.ticketbox.core.service.BookingService;
import com.noah.ticketbox.core.service.CreateEventCommand;
import com.noah.ticketbox.core.service.EventService;
import com.noah.ticketbox.core.service.ReportService;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import java.util.stream.Stream;

/**
 * Week 1 console demo. Run: {@code mvn -pl ticketbox-core exec:java}
 *
 * <p>Wiring is done by hand here ("poor man's DI"). In Week 2 Spring does exactly this for us.
 */
public final class Week1DemoApp {

    public static void main(String[] args) throws InterruptedException {
        // ---- 1. Wiring (manual dependency injection) ----
        Clock clock = Clock.systemUTC();
        IdGenerator ids = new IdGenerator();
        Repository<Event, Long> eventRepo = new InMemoryRepository<>();
        Repository<Booking, Long> bookingRepo = new InMemoryRepository<>();

        PricingStrategy pricing = PricingStrategy.seatPrice().withDiscountPercent(10)                     // early-bird
            .withServiceFee(new BigDecimal("5000"));      // per ticket

        EventService eventService = new EventService(eventRepo, new SeatMapFactory(), ids, clock);
        BookingService bookingService = new BookingService(eventRepo, bookingRepo, pricing, new IdGenerator(), clock, Duration.ofMinutes(10));
        ReportService reportService = new ReportService(eventRepo, bookingRepo);

        // ---- 2. Create & publish an event ----
        section("1. Create event (Builder + Factory + Stream)");
        Event concert = eventService.create(new CreateEventCommand("Noah Live Concert", "Saigon Opera House", LocalDateTime.now(clock).plusDays(30), new SeatLayout(5, 8, 1, new BigDecimal("500000"))));
        eventService.publish(concert.id());
        System.out.println(concert);
        System.out.println(SeatMapPrinter.render(concert, clock.instant()));

        // ---- 3. Book seats ----
        section("2. Hold + confirm (PricingStrategy composed with lambdas)");
        Booking alice = bookingService.hold(concert.id(), "alice", seats("A1", "A2"));
        System.out.println("Hold    : " + alice);
        bookingService.confirm(alice.id(), "alice");
        System.out.println("Confirm : " + alice);

        Booking bob = bookingService.hold(concert.id(), "bob", seats("C4", "C5", "C6"));
        System.out.println("Hold    : " + bob);

        // ---- 4. Business error ----
        section("3. Double booking -> custom exception");
        try {
            bookingService.hold(concert.id(), "carol", seats("A2", "A3"));
        } catch (BusinessException e) {
            System.out.println(e.errorCode() + " -> " + e.getMessage());
        }

        // ---- 5. Result<T> instead of exceptions ----
        section("4. Result<T> + fold (functional error handling)");
        Result<Booking> result = bookingService.tryHold(concert.id(), "dave", seats("C5"));
        String message = result.fold(b -> "OK " + b.id(), f -> "FAILED " + f.errorCode());
        System.out.println(message);

        // ---- 6. Concurrency ----
        section("5. 100 threads race for seat E8");
        int winners = race(bookingService, concert.id(), SeatPosition.parse("E8"), 100);
        System.out.println("Successful holds: " + winners + " (expected exactly 1)");

        // ---- 7. Reports ----
        section("6. Reports (groupingBy / partitioningBy / reducing)");
        System.out.println(SeatMapPrinter.render(concert, clock.instant()));
        var stats = reportService.statsOf(concert.id());
        System.out.println("By status   : " + stats.countByStatus());
        System.out.println("Sold by type: " + stats.soldByType());
        System.out.println("Occupancy   : " + stats.occupancyPercent() + "%");
        System.out.println("Free VIP?   : " + reportService.availableVipVsStandard(concert.id()));
        System.out.println("Revenue     : " + reportService.revenueByEvent());
        System.out.println("Bookings    : " + reportService.bookingCountByStatus());
    }

    private static int race(BookingService service, Long eventId, SeatPosition seat, int threads) throws InterruptedException {
        AtomicInteger successes = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        IntStream.range(0, threads).forEach(i -> pool.submit(() -> {
            if (service.tryHold(eventId, "user-" + i, List.of(seat)).isSuccess()) {
                successes.incrementAndGet();
            }
        }));
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        return successes.get();
    }

    private static List<SeatPosition> seats(String... codes) {
        return Stream.of(codes).map(SeatPosition::parse).toList();
    }

    private static void section(String title) {
        System.out.println("\n=== " + title + " ===");
    }
}
