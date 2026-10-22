package com.noah.ticketbox.core.exception;

import java.util.Collection;

/** One or more requested seats are already held or sold. Maps to HTTP 409. */
public class SeatNotAvailableException extends BusinessException {

    public SeatNotAvailableException(Collection<?> positions) {
        super(ErrorCode.SEAT_NOT_AVAILABLE, "Seats not available: " + positions);
    }
}
