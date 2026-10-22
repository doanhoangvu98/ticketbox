package com.noah.ticketbox.api.seat.dto;

import com.noah.ticketbox.api.seat.SeatEntity;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.domain.SeatType;

import java.math.BigDecimal;

/** heldBy is intentionally NOT exposed: other users must not see who holds a seat. */
public record SeatResponse(String code, String row, int number, SeatType type, BigDecimal price, SeatStatus status) {

    public static SeatResponse from(SeatEntity s) {
        return new SeatResponse(s.code(), s.getRowLabel(), s.getSeatNumber(), s.getType(), s.getPrice(), s.getStatus());
    }
}
