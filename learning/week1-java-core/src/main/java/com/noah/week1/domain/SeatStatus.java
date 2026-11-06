package com.noah.week1.domain;

/** AVAILABLE -> HELD -> SOLD, or HELD -> AVAILABLE when the hold is released. */
public enum SeatStatus {
    AVAILABLE,
    HELD,
    SOLD
}
