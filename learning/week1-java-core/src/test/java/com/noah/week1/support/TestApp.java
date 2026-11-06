package com.noah.week1.support;

import com.noah.week1.common.IdGenerator;
import com.noah.week1.domain.Event;
import com.noah.week1.domain.Order;
import com.noah.week1.domain.SeatLayout;
import com.noah.week1.domain.SeatMapFactory;
import com.noah.week1.domain.SeatPosition;
import com.noah.week1.domain.SeatPricing;
import com.noah.week1.repository.InMemoryRepository;
import com.noah.week1.repository.Repository;
import com.noah.week1.service.CreateEventCommand;
import com.noah.week1.service.EventLocks;
import com.noah.week1.service.EventService;
import com.noah.week1.service.OrderService;
import com.noah.week1.service.ReportService;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;

/** Wires the services the same way the demo does, with a controllable clock. One instance per test. */
public final class TestApp {

    public static final Instant NOW = Instant.parse("2026-11-01T00:00:00Z");
    public static final Duration HOLD = Duration.ofMinutes(10);

    public final MutableClock clock = new MutableClock(NOW);
    public final Repository<Event, Long> events = new InMemoryRepository<>();
    public final Repository<Order, Long> orders = new InMemoryRepository<>();
    public final EventLocks locks = new EventLocks();
    public final EventService eventService = new EventService(events, new SeatMapFactory(), new IdGenerator(), clock, locks);
    public final OrderService orderService = new OrderService(events, orders, new IdGenerator(), clock, HOLD, locks);
    public final ReportService reportService = new ReportService(events, locks);

    /** 3 rows x 4 seats, row A is VIP. Standard 100,000, VIP 150,000. */
    public Event draftEvent() {
        return eventService.create(new CreateEventCommand("Test Show", "Hall 1",
                NOW.plus(Duration.ofDays(30)), NOW.plus(Duration.ofDays(30)).plus(Duration.ofHours(2)),
                new SeatLayout(3, 4), new SeatPricing(new BigDecimal("100000"), 1)));
    }

    public Event publishedEvent() {
        return eventService.publish(draftEvent().id());
    }

    public static List<SeatPosition> seats(String... codes) {
        return Stream.of(codes).map(SeatPosition::parse).toList();
    }
}
