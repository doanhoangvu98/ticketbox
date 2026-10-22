package com.noah.ticketbox.core.exception;

/**
 * Stable business error codes. The API layer maps each code to an HTTP status,
 * clients can rely on the code instead of parsing messages.
 */
public enum ErrorCode {
    EVENT_NOT_FOUND,
    VENUE_NOT_FOUND,
    SEAT_NOT_FOUND,
    BOOKING_NOT_FOUND,
    SEAT_NOT_AVAILABLE,
    BOOKING_EXPIRED,
    INVALID_STATE,
    INVALID_ARGUMENT
}
