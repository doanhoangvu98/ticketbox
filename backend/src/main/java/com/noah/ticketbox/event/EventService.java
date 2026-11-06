package com.noah.ticketbox.event;

import com.noah.ticketbox.common.error.NotFoundException;
import com.noah.ticketbox.event.dto.CreateEventRequest;
import com.noah.ticketbox.event.dto.EventResponse;
import com.noah.ticketbox.event.dto.EventSearchCriteria;
import com.noah.ticketbox.event.dto.EventSummaryResponse;
import com.noah.ticketbox.event.dto.UpdateEventRequest;
import com.noah.ticketbox.seat.SeatMapGenerator;
import com.noah.ticketbox.seat.SeatRepository;
import com.noah.ticketbox.seat.SeatStatus;
import com.noah.ticketbox.venue.VenueEntity;
import com.noah.ticketbox.venue.VenueRepository;
import java.util.EnumMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Class default readOnly (no dirty checking for reads); write methods override it. No save() after
 * publish/cancel/edit: the entity is managed, Hibernate flushes the change on commit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

  private final EventRepository eventRepository;
  private final VenueRepository venueRepository;
  private final SeatRepository seatRepository;
  private final SeatMapGenerator seatMapGenerator;
  private final EventMapper mapper;

  @Transactional
  public EventResponse create(CreateEventRequest request) {
    VenueEntity venue =
        venueRepository
            .findById(request.venueId())
            .orElseThrow(() -> NotFoundException.venue(request.venueId()));
    EventEntity event =
        eventRepository.save(
            new EventEntity(
                request.name(),
                venue,
                request.startsAt(),
                request.endsAt(),
                request.basePrice(),
                request.vipRows()));
    seatRepository.saveAll(seatMapGenerator.generate(event)); // batched inserts, see ADR-005
    log.info("Created event id={} seats={}", event.getId(), venue.capacity());
    return mapper.toResponse(event, countSeats(event.getId()));
  }

  public Page<EventSummaryResponse> search(EventSearchCriteria criteria, Pageable pageable) {
    return eventRepository
        .findAll(EventSpecifications.from(criteria), pageable)
        .map(mapper::toSummary);
  }

  public EventResponse get(Long id) {
    return mapper.toResponse(getEntity(id), countSeats(id));
  }

  @Transactional
  public EventResponse update(Long id, UpdateEventRequest request) {
    EventEntity event = getEntity(id);
    event.edit(request.name(), request.startsAt(), request.endsAt());
    return mapper.toResponse(event, countSeats(id));
  }

  @Transactional
  public EventResponse publish(Long id) {
    EventEntity event = getEntity(id);
    event.publish();
    return mapper.toResponse(event, countSeats(id));
  }

  @Transactional
  public EventResponse cancel(Long id) {
    EventEntity event = getEntity(id);
    event.cancel();
    return mapper.toResponse(event, countSeats(id));
  }

  private EventEntity getEntity(Long id) {
    return eventRepository.findWithVenueById(id).orElseThrow(() -> NotFoundException.event(id));
  }

  /** One GROUP BY query; missing statuses are filled with 0 so the JSON always has every key. */
  private Map<SeatStatus, Long> countSeats(Long eventId) {
    Map<SeatStatus, Long> counts = new EnumMap<>(SeatStatus.class);
    for (SeatStatus s : SeatStatus.values()) {
      counts.put(s, 0L);
    }
    seatRepository
        .countByStatus(eventId)
        .forEach(row -> counts.put(row.getStatus(), row.getTotal()));
    return counts;
  }
}
