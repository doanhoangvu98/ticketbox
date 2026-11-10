package com.noah.ticketbox.core.domain;

/** Seat lifecycle: AVAILABLE -> HELD -> SOLD (a hold can also go back to AVAILABLE). */
public enum SeatStatus {
    AVAILABLE, HELD, SOLD
}
