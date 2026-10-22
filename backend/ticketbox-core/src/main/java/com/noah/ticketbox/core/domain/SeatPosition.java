package com.noah.ticketbox.core.domain;

import java.util.Comparator;

/**
 * Value object: a seat location such as "A12".
 *
 * <p>A record gives us final fields plus correct {@code equals/hashCode/toString} for free,
 * which matters because SeatPosition is used as a {@code Map} key and inside {@code Set}s.
 *
 * <p>Implements {@link Comparable} so seats sort naturally: A1, A2, ..., A10, B1 (not A1, A10, A2).
 */
public record SeatPosition(char row, int number) implements Comparable<SeatPosition> {

    private static final Comparator<SeatPosition> NATURAL_ORDER = Comparator.comparing((SeatPosition seat) -> seat.row()).thenComparingInt(seat -> seat.number());

    /**
     * Compact constructor: validation runs before fields are assigned.
     */
    public SeatPosition {
        if (row < 'A' || row > 'Z') {
            throw new IllegalArgumentException("Row must be A-Z: " + row);
        }
        if (number < 1) {
            throw new IllegalArgumentException("Seat number must be >= 1: " + number);
        }
    }

    /**
     * Parses "A12" into SeatPosition('A', 12).
     */
    public static SeatPosition parse(String code) {
        if (code == null || code.length() < 2) {
            throw new IllegalArgumentException("Invalid seat code: " + code);
        }
        String normalized = code.trim().toUpperCase();
        return new SeatPosition(normalized.charAt(0), Integer.parseInt(normalized.substring(1)));
    }

    public String code() {
        return row + String.valueOf(number);
    }

    @Override
    public int compareTo(SeatPosition other) {
        return NATURAL_ORDER.compare(this, other);
    }

    @Override
    public String toString() {
        return code();
    }
}
