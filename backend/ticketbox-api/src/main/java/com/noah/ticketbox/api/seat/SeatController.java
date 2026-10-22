package com.noah.ticketbox.api.seat;

import com.noah.ticketbox.api.seat.dto.SeatResponse;
import com.noah.ticketbox.core.domain.SeatStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Seats")
@RestController
@RequestMapping("/api/v1/events/{eventId}/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    @Operation(summary = "Seat map of an event. Optional ?status=AVAILABLE|HELD|SOLD")
    @GetMapping
    public List<SeatResponse> list(@PathVariable Long eventId,
                                   @RequestParam(required = false) SeatStatus status) {
        return seatService.listSeats(eventId, status);
    }
}
