package com.noah.week1.domain;

/** Shape of a venue's seat map. Belongs to the venue, never changes per event. */
public record SeatLayout(int rows, int seatsPerRow) {

    public SeatLayout {
        if (rows < 1 || rows > 26) {
            throw new IllegalArgumentException("rows must be 1..26");
        }
        if (seatsPerRow < 1) {
            throw new IllegalArgumentException("seatsPerRow must be >= 1");
        }
    }
}
