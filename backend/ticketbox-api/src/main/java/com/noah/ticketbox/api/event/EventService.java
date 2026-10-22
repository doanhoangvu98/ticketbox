package com.noah.ticketbox.api.event;

import com.noah.ticketbox.api.event.dto.CreateEventRequest;
import com.noah.ticketbox.api.event.dto.EventResponse;
import com.noah.ticketbox.api.event.dto.EventSearchCriteria;
import com.noah.ticketbox.api.event.dto.EventSummaryResponse;
import com.noah.ticketbox.api.event.dto.UpdateEventRequest;
import com.noah.ticketbox.api.seat.SeatEntity;
import com.noah.ticketbox.api.seat.SeatRepository;
import com.noah.ticketbox.api.venue.VenueEntity;
import com.noah.ticketbox.api.venue.VenueRepository;
import com.noah.ticketbox.core.domain.SeatLayout;
import com.noah.ticketbox.core.domain.SeatMapFactory;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Event use cases.
 *
 * <p>Transactions: the class default is {@code readOnly = true} (Hibernate skips dirty checking,
 * the driver may route to a replica); write methods override it with {@code @Transactional}.
 *
 * <p>Note: no explicit save() after publish()/cancel()/rename(). The entity is "managed" inside
 * the transaction, Hibernate detects the change (dirty checking) and issues the UPDATE on commit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final SeatRepository seatRepository;
    private final SeatMapFactory seatMapFactory;   // reused from ticketbox-core (Week 1)
    private final EventMapper mapper;

    @Transactional
    public EventResponse create(CreateEventRequest request) {
        VenueEntity venue = venueRepository.findById(request.venueId())
                .orElseThrow(() -> NotFoundException.venue(request.venueId()));
        if (request.vipRows() > venue.getTotalRows()) {
            throw new IllegalArgumentException("vipRows (%d) exceeds venue rows (%d)"
                    .formatted(request.vipRows(), venue.getTotalRows()));
        }

        EventEntity event = eventRepository.save(new EventEntity(
                request.name().trim(), venue, request.startsAt(), request.basePrice(), request.vipRows()));

        // Same factory as Week 1 -> same VIP/price rules, no duplicated logic.
        SeatLayout layout = new SeatLayout(venue.getTotalRows(), venue.getSeatsPerRow(),
                request.vipRows(), request.basePrice());
        List<SeatEntity> seats = seatMapFactory.create(layout).stream()
                .map(seat -> SeatEntity.of(event, seat))
                .toList();
        seatRepository.saveAll(seats); // JDBC batching, see application.yml + ADR-005

        log.info("Created event id={} name='{}' seats={}", event.getId(), event.getName(), seats.size());
        return mapper.toResponse(event, countSeats(event.getId()));
    }

    public Page<EventSummaryResponse> search(EventSearchCriteria criteria, Pageable pageable) {
        return eventRepository.findAll(EventSpecifications.from(criteria), pageable).map(mapper::toSummary);
    }

    public EventResponse get(Long id) {
        EventEntity event = eventRepository.findWithVenueById(id).orElseThrow(() -> NotFoundException.event(id));
        return mapper.toResponse(event, countSeats(id));
    }

    @Transactional
    public EventResponse update(Long id, UpdateEventRequest request) {
        EventEntity event = getEntity(id);
        event.rename(request.name().trim(), request.startsAt());
        return mapper.toResponse(event, countSeats(id));
    }

    @Transactional
    public EventResponse publish(Long id) {
        EventEntity event = getEntity(id);
        event.publish();
        log.info("Published event id={}", id);
        return mapper.toResponse(event, countSeats(id));
    }

    @Transactional
    public EventResponse cancel(Long id) {
        EventEntity event = getEntity(id);
        event.cancel();
        log.info("Cancelled event id={}", id);
        return mapper.toResponse(event, countSeats(id));
    }

    private EventEntity getEntity(Long id) {
        return eventRepository.findWithVenueById(id).orElseThrow(() -> NotFoundException.event(id));
    }

    /** One GROUP BY query, then fill missing statuses with 0 so the JSON always has all keys. */
    private Map<SeatStatus, Long> countSeats(Long eventId) {
        Map<SeatStatus, Long> counts = new EnumMap<>(SeatStatus.class);
        for (SeatStatus s : SeatStatus.values()) {
            counts.put(s, 0L);
        }
        seatRepository.countByStatus(eventId).forEach(row -> counts.put(row.getStatus(), row.getTotal()));
        return counts;
    }
}
