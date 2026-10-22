package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.common.IdGenerator;
import com.noah.ticketbox.core.common.Result;
import com.noah.ticketbox.core.domain.*;
import com.noah.ticketbox.core.exception.BusinessException;
import com.noah.ticketbox.core.exception.InvalidStateException;
import com.noah.ticketbox.core.exception.NotFoundException;
import com.noah.ticketbox.core.exception.SeatNotAvailableException;
import com.noah.ticketbox.core.pricing.PricingStrategy;
import com.noah.ticketbox.core.repository.Repository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * Hold / confirm / cancel seats.
 *
 * <h2>Concurrency design (the core Middle topic of Week 1)</h2>
 * The invariant "one seat belongs to at most one active booking" is a check-then-act:
 * (1) check all requested seats are free, (2) mark them held. If two threads interleave
 * between (1) and (2), both succeed and the seat is sold twice.
 *
 * <p>Solution: one {@link ReentrantLock} per event. All seat mutations of an event run inside
 * {@link #withEventLock}. Different events never block each other.
 *
 * <p>Week 3 replaces this JVM lock with database locking (optimistic {@code @Version} or
 * {@code SELECT ... FOR UPDATE}) because a JVM lock does not work across several app instances.
 */
public class BookingService {

    private final Repository<Event, Long> events;
    private final Repository<Booking, Long> bookings;
    private final PricingStrategy pricing;
    private final IdGenerator ids;
    private final Clock clock;
    private final Duration holdDuration;

    private final ConcurrentMap<Long, ReentrantLock> eventLocks = new ConcurrentHashMap<>();

    public BookingService(Repository<Event, Long> events, Repository<Booking, Long> bookings, PricingStrategy pricing, IdGenerator ids, Clock clock, Duration holdDuration) {
        this.events = Objects.requireNonNull(events);
        this.bookings = Objects.requireNonNull(bookings);
        this.pricing = Objects.requireNonNull(pricing);
        this.ids = Objects.requireNonNull(ids);
        this.clock = Objects.requireNonNull(clock);
        this.holdDuration = Objects.requireNonNull(holdDuration);
    }

    /**
     * Holds all requested seats or none of them (all-or-nothing).
     *
     * @throws SeatNotAvailableException if at least one seat is taken
     */
    public Booking hold(Long eventId, String userId, List<SeatPosition> positions) {
        validateRequest(positions);
        return withEventLock(eventId, () -> {
            Event event = getEvent(eventId);
            if (!event.status().isBookable()) {
                throw new InvalidStateException("Event " + eventId + " is not open for booking");
            }
            Instant now = clock.instant();

            List<Seat> seats = positions.stream().map(p -> event.seat(p).orElseThrow(() -> NotFoundException.seat(p))).toList();

            List<SeatPosition> unavailable = seats.stream().filter(seat -> !seat.isAvailableAt(now)).map(Seat::position).toList();
            if (!unavailable.isEmpty()) {
                throw new SeatNotAvailableException(unavailable);
            }

            Instant expiresAt = now.plus(holdDuration);
            seats.forEach(seat -> seat.hold(userId, expiresAt, now));

            BigDecimal total = seats.stream().map(pricing::priceOf).reduce(BigDecimal.ZERO, BigDecimal::add);

            Booking booking = new Booking(ids.next(), eventId, userId, positions, total, now, expiresAt);
            return bookings.save(booking);
        });
    }

    /**
     * Same as {@link #hold} but returns a Result instead of throwing. Handy for batch/concurrent callers.
     */
    public Result<Booking> tryHold(Long eventId, String userId, List<SeatPosition> positions) {
        try {
            return Result.success(hold(eventId, userId, positions));
        } catch (BusinessException e) {
            return Result.failure(e.errorCode().name(), e.getMessage());
        }
    }

    /**
     * Payment succeeded: HELD seats become SOLD.
     */
    public Booking confirm(Long bookingId, String userId) {
        Booking booking = getOwnedBooking(bookingId, userId);
        return withEventLock(booking.eventId(), () -> {
            booking.confirm(clock.instant()); // throws BookingExpiredException when too late
            Event event = getEvent(booking.eventId());
            booking.seats().forEach(p -> event.seat(p).orElseThrow().sell(userId));
            return booking;
        });
    }

    public Booking cancel(Long bookingId, String userId) {
        Booking booking = getOwnedBooking(bookingId, userId);
        return withEventLock(booking.eventId(), () -> {
            booking.cancel();
            releaseSeats(booking);
            return booking;
        });
    }

    /**
     * Housekeeping: marks timed-out bookings EXPIRED and frees their seats.
     * Week 3 will call this from a {@code @Scheduled} job.
     *
     * @return number of bookings expired
     */
    public int releaseExpiredHolds() {
        Instant now = clock.instant();
        List<Booking> expired = bookings.findAll(b -> b.isExpiredAt(now));
        expired.forEach(b -> withEventLock(b.eventId(), () -> {
            if (b.status() == BookingStatus.PENDING) { // re-check inside the lock
                b.expire();
                releaseSeats(b);
            }
            return null;
        }));
        return expired.size();
    }

    public List<Booking> findByUser(String userId) {
        return bookings.findAll(b -> b.userId().equals(userId));
    }

    // ---------------------------------------------------------------------------------------------

    /**
     * Generic helper: runs {@code action} while holding the lock of one event.
     * {@code Supplier<T>} lets every caller return its own type (Booking, Void, ...).
     * try/finally guarantees the lock is released even when the action throws.
     */
    private <T> T withEventLock(Long eventId, Supplier<T> action) {
        ReentrantLock lock = eventLocks.computeIfAbsent(eventId, id -> new ReentrantLock());
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
        }
    }

    private void releaseSeats(Booking booking) {
        Event event = getEvent(booking.eventId());
        booking.seats().stream().map(event::seat).flatMap(java.util.Optional::stream).filter(seat -> booking.userId().equals(seat.holder().orElse(null))).forEach(Seat::release);
    }

    private static void validateRequest(List<SeatPosition> positions) {
        if (positions == null || positions.isEmpty()) {
            throw new IllegalArgumentException("At least one seat is required");
        }
        if (new HashSet<>(positions).size() != positions.size()) {
            throw new IllegalArgumentException("Duplicate seats in request: " + positions);
        }
    }

    private Event getEvent(Long eventId) {
        return events.findById(eventId).orElseThrow(() -> NotFoundException.event(eventId));
    }

    private Booking getOwnedBooking(Long bookingId, String userId) {
        return bookings.findById(bookingId).filter(b -> b.userId().equals(userId)) // do not reveal other users' bookings
            .orElseThrow(() -> NotFoundException.booking(bookingId));
    }
}
