package com.noah.week1.service;

import com.noah.week1.common.IdGenerator;
import com.noah.week1.domain.Event;
import com.noah.week1.domain.Order;
import com.noah.week1.domain.OrderStatus;
import com.noah.week1.domain.Seat;
import com.noah.week1.domain.SeatPosition;
import com.noah.week1.exception.InvalidStateException;
import com.noah.week1.exception.NotFoundException;
import com.noah.week1.exception.SeatNotAvailableException;
import com.noah.week1.repository.Repository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

/**
 * Hold, pay, cancel. "A seat belongs to at most one active order" is a check-then-act over several seats,
 * so every seat change runs inside {@link EventLocks#withLock}.
 */
public class OrderService {

    private final Repository<Event, Long> events;
    private final Repository<Order, Long> orders;
    private final IdGenerator ids;
    private final Clock clock;
    private final Duration holdDuration;
    private final EventLocks locks;

    public OrderService(Repository<Event, Long> events, Repository<Order, Long> orders, IdGenerator ids,
                        Clock clock, Duration holdDuration, EventLocks locks) {
        this.events = events;
        this.orders = orders;
        this.ids = ids;
        this.clock = clock;
        this.holdDuration = holdDuration;
        this.locks = locks;
    }

    /** Holds all requested seats or none of them. */
    public Order hold(Long eventId, String userId, List<SeatPosition> positions) {
        requireDistinct(positions); // no shared state: checked before taking the lock
        return locks.withLock(eventId, () -> {
            Event event = getEvent(eventId);
            if (!event.status().isBookable()) {
                throw new InvalidStateException("Event " + eventId + " is not on sale");
            }
            Instant now = clock.instant();
            List<Seat> seats = positions.stream()
                    .map(p -> event.seat(p).orElseThrow(() -> NotFoundException.seat(p)))
                    .toList();

            List<SeatPosition> taken = seats.stream()
                    .filter(seat -> !seat.isAvailableAt(now))
                    .map(Seat::position)
                    .toList();
            if (!taken.isEmpty()) {
                throw new SeatNotAvailableException(taken);
            }

            Instant expiresAt = now.plus(holdDuration);
            seats.forEach(seat -> seat.hold(userId, expiresAt, now));
            BigDecimal total = seats.stream().map(Seat::price).reduce(BigDecimal.ZERO, BigDecimal::add);
            return orders.save(new Order(ids.next(), eventId, userId, positions, total, expiresAt));
        });
    }

    public Order pay(Long orderId, String userId) {
        Order order = getOwnedOrder(orderId, userId);
        return locks.withLock(order.eventId(), () -> {
            order.pay(clock.instant()); // too late -> OrderExpiredException, seats may belong to someone else now
            Event event = getEvent(order.eventId());
            order.seats().forEach(p -> event.seat(p).orElseThrow().sell(userId));
            return order;
        });
    }

    public Order cancel(Long orderId, String userId) {
        Order order = getOwnedOrder(orderId, userId);
        return locks.withLock(order.eventId(), () -> {
            order.cancel();
            releaseSeats(order);
            return order;
        });
    }

    /** Housekeeping for timed-out holds. Returns how many orders were expired. */
    public int releaseExpiredHolds() {
        Instant now = clock.instant();
        List<Order> candidates = orders.findAll(o -> o.isExpiredAt(now)); // cheap filter outside the lock
        int expired = 0;
        for (Order order : candidates) {
            boolean changed = locks.withLock(order.eventId(), () -> {
                if (order.status() != OrderStatus.PENDING) {
                    return false; // re-check inside the lock: it may have been paid or cancelled meanwhile
                }
                order.expire();
                releaseSeats(order);
                return true;
            });
            if (changed) {
                expired++;
            }
        }
        return expired;
    }

    private void releaseSeats(Order order) {
        Event event = getEvent(order.eventId());
        order.seats().stream()
                .map(event::seat)
                .flatMap(Optional::stream)
                // after an expired hold another buyer may already hold the seat: only release our own
                .filter(seat -> order.userId().equals(seat.holder().orElse(null)))
                .forEach(Seat::release);
    }

    private static void requireDistinct(List<SeatPosition> positions) {
        if (positions.isEmpty()) {
            throw new IllegalArgumentException("At least one seat is required");
        }
        if (new HashSet<>(positions).size() != positions.size()) {
            throw new IllegalArgumentException("Duplicate seats in request: " + positions);
        }
    }

    private Event getEvent(Long eventId) {
        return events.findById(eventId).orElseThrow(() -> NotFoundException.event(eventId));
    }

    /** Someone else's order looks like a missing one: do not reveal that it exists. */
    private Order getOwnedOrder(Long orderId, String userId) {
        return orders.findById(orderId)
                .filter(o -> o.userId().equals(userId))
                .orElseThrow(() -> NotFoundException.order(orderId));
    }
}
