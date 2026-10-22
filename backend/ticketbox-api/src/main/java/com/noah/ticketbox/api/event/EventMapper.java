package com.noah.ticketbox.api.event;

import com.noah.ticketbox.api.event.dto.EventResponse;
import com.noah.ticketbox.api.event.dto.EventSummaryResponse;
import com.noah.ticketbox.core.domain.SeatStatus;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Entity -> DTO mapping, written by hand (see ADR-006: MapStruct is not worth it at this size).
 * Must be called inside a transaction because it reads the lazy venue association.
 */
@Component
public class EventMapper {

    public EventSummaryResponse toSummary(EventEntity e) {
        return new EventSummaryResponse(e.getId(), e.getName(), e.getVenue().getName(),
                e.getStartsAt(), e.getBasePrice(), e.getStatus());
    }

    public EventResponse toResponse(EventEntity e, Map<SeatStatus, Long> seatCounts) {
        var venue = e.getVenue();
        return new EventResponse(
                e.getId(), e.getName(),
                new EventResponse.VenueInfo(venue.getId(), venue.getName(), venue.getAddress()),
                e.getStartsAt(), e.getBasePrice(), e.getVipRows(), e.getStatus(),
                venue.capacity(), seatCounts, e.getVersion(), e.getCreatedAt(), e.getUpdatedAt());
    }
}
