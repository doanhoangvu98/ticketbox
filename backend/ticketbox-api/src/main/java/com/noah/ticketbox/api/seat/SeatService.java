package com.noah.ticketbox.api.seat;

import com.noah.ticketbox.api.event.EventRepository;
import com.noah.ticketbox.api.seat.dto.SeatResponse;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private final SeatRepository seatRepository;
    private final EventRepository eventRepository;

    /** Seat map of an event, optionally filtered by status. Sorted A1, A2, ..., B1. */
    public List<SeatResponse> listSeats(Long eventId, SeatStatus status) {
        if (!eventRepository.existsById(eventId)) {
            throw NotFoundException.event(eventId); // 404 instead of a misleading empty list
        }
        List<SeatEntity> seats = (status == null)
                ? seatRepository.findByEventIdOrderByRowLabelAscSeatNumberAsc(eventId)
                : seatRepository.findByEventIdAndStatusOrderByRowLabelAscSeatNumberAsc(eventId, status);
        return seats.stream().map(SeatResponse::from).toList();
    }
}
