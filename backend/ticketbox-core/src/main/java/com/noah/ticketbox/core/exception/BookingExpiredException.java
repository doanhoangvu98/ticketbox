package com.noah.ticketbox.core.exception;

/**
 * The hold window of a booking is over; seats may already belong to someone else.
 */
public class BookingExpiredException extends BusinessException {

    public BookingExpiredException(Object bookingId) {
        super(ErrorCode.BOOKING_EXPIRED, "Booking expired: " + bookingId);
    }
}
