package com.noah.week1.demo;

import com.noah.week1.common.IdGenerator;
import com.noah.week1.domain.Event;
import com.noah.week1.domain.Order;
import com.noah.week1.domain.SeatLayout;
import com.noah.week1.domain.SeatMapFactory;
import com.noah.week1.domain.SeatPosition;
import com.noah.week1.domain.SeatPricing;
import com.noah.week1.exception.BusinessException;
import com.noah.week1.repository.InMemoryRepository;
import com.noah.week1.repository.Repository;
import com.noah.week1.service.CreateEventCommand;
import com.noah.week1.service.EventLocks;
import com.noah.week1.service.EventService;
import com.noah.week1.service.EventStats;
import com.noah.week1.service.OrderService;
import com.noah.week1.service.ReportService;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

/** Console demo. Run: {@code mvn exec:java}. Wiring is done by hand; Spring does the same automatically later. */
public final class Week1DemoApp {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    public static void main(String[] args) {
        Clock clock = Clock.systemUTC();
        Repository<Event, Long> eventRepo = new InMemoryRepository<>();
        EventLocks locks = new EventLocks();
        EventService eventService = new EventService(eventRepo, new SeatMapFactory(), new IdGenerator(), clock, locks);
        OrderService orderService = new OrderService(eventRepo, new InMemoryRepository<>(), new IdGenerator(), clock,
                Duration.ofMinutes(10), locks);
        ReportService reportService = new ReportService(eventRepo, locks);

        section("1. Create and publish an event");
        // Input is Vietnam local time; it is converted to an Instant (UTC) right at the boundary.
        LocalDate showDay = LocalDate.now(VIETNAM).plusDays(30);
        Event concert = eventService.create(new CreateEventCommand("Noah Live Concert", "Saigon Opera House",
                ZonedDateTime.of(showDay, LocalTime.of(20, 0), VIETNAM).toInstant(),
                ZonedDateTime.of(showDay, LocalTime.of(22, 30), VIETNAM).toInstant(),
                new SeatLayout(5, 8), new SeatPricing(new BigDecimal("500000"), 1)));
        eventService.publish(concert.id());
        System.out.println(concert.name() + ": " + concert.startsAt().atZone(VIETNAM).toLocalDateTime()
                + " -> " + concert.endsAt().atZone(VIETNAM).toLocalTime() + " (Vietnam time)");
        System.out.println(SeatMapPrinter.render(concert, clock.instant()));

        section("2. Hold then pay");
        Order alice = orderService.hold(concert.id(), "alice", seats("A1", "A2"));
        orderService.pay(alice.id(), "alice");
        System.out.println(alice);
        System.out.println(orderService.hold(concert.id(), "bob", seats("C4", "C5")));

        section("3. Seat already held -> business error");
        try {
            orderService.hold(concert.id(), "carol", seats("A2", "A3"));
        } catch (BusinessException e) {
            System.out.println(e.errorCode() + ": " + e.getMessage());
        }

        section("4. 10,000 buyers (virtual threads) race for seat E8");
        System.out.println("Winners: " + race(orderService, concert.id(), SeatPosition.parse("E8"), 10_000)
                + " (expected 1)");

        section("5. Report");
        System.out.println(SeatMapPrinter.render(concert, clock.instant()));
        EventStats stats = reportService.statsOf(concert.id());
        System.out.println("By status: " + stats.countByStatus() + ", sold value: " + stats.soldValue()
                + ", occupancy: " + stats.occupancyPercent() + "%");
    }

    private static int race(OrderService service, Long eventId, SeatPosition seat, int buyers) {
        AtomicInteger winners = new AtomicInteger();
        // One cheap virtual thread per buyer; close() waits until every task has finished.
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < buyers; i++) {
                String buyer = "user-" + i;
                executor.submit(() -> {
                    try {
                        service.hold(eventId, buyer, List.of(seat));
                        winners.incrementAndGet();
                    } catch (BusinessException lost) {
                        // expected for everyone but the winner
                    }
                });
            }
        }
        return winners.get();
    }

    private static List<SeatPosition> seats(String... codes) {
        return Stream.of(codes).map(SeatPosition::parse).toList();
    }

    private static void section(String title) {
        System.out.println("\n=== " + title + " ===");
    }
}
