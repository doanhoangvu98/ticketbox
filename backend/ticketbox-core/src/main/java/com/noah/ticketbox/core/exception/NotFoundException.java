package com.noah.ticketbox.core.exception;

/** A requested resource does not exist. Static factories keep messages consistent. */
public class NotFoundException extends BusinessException {

    public NotFoundException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public static NotFoundException event(Object id) {
        return new NotFoundException(ErrorCode.EVENT_NOT_FOUND, "Event not found: " + id);
    }

    public static NotFoundException venue(Object id) {
        return new NotFoundException(ErrorCode.VENUE_NOT_FOUND, "Venue not found: " + id);
    }

    public static NotFoundException seat(Object position) {
        return new NotFoundException(ErrorCode.SEAT_NOT_FOUND, "Seat not found: " + position);
    }

    public static NotFoundException booking(Object id) {
        return new NotFoundException(ErrorCode.BOOKING_NOT_FOUND, "Booking not found: " + id);
    }
}
