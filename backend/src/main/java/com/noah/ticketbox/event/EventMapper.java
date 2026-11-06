package com.noah.ticketbox.event;

import com.noah.ticketbox.event.dto.EventResponse;
import com.noah.ticketbox.event.dto.EventSummaryResponse;
import com.noah.ticketbox.seat.SeatStatus;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Hand-written mapping (ADR-006). Call inside a transaction: it reads the lazy venue. */
@Component
public class EventMapper {
  public EventSummaryResponse toSummary(EventEntity e) {
    return new EventSummaryResponse(
        e.getId(),
        e.getName(),
        e.getVenue().getName(),
        e.getStartsAt(),
        e.getEndsAt(),
        e.getBasePrice(),
        e.getStatus());
  }

  public EventResponse toResponse(EventEntity e, Map<SeatStatus, Long> seatCounts) {
    var venue = e.getVenue();
    return new EventResponse(
        e.getId(),
        e.getName(),
        new EventResponse.VenueInfo(venue.getId(), venue.getName(), venue.getAddress()),
        e.getStartsAt(),
        e.getEndsAt(),
        e.getBasePrice(),
        e.getVipRows(),
        e.getStatus(),
        venue.capacity(),
        seatCounts,
        e.getVersion());
  }
}
