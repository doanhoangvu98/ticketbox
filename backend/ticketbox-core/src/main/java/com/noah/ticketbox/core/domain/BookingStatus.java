package com.noah.ticketbox.core.domain;

/** PENDING (seats held) -> CONFIRMED (paid) | CANCELLED (by user) | EXPIRED (hold timed out). */
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    CANCELLED,
    EXPIRED;

    public boolean isFinal() {
        return this != PENDING;
    }
}
