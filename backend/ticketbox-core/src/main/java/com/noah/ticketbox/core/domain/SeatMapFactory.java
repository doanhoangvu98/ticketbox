package com.noah.ticketbox.core.domain;

import java.util.List;
import java.util.stream.IntStream;

/**
 * Factory pattern: callers ask for "a seat map for this layout" and do not care
 * which Seat subclass is created for each row.
 *
 * <p>Knowledge shown: nested {@code IntStream} + {@code flatMap} instead of two for-loops.
 */
public final class SeatMapFactory {

    public List<Seat> create(SeatLayout layout) {
        return IntStream.range(0, layout.rows()).boxed()
            .flatMap(rowIndex -> IntStream.rangeClosed(1, layout.seatsPerRow())
                .mapToObj(number -> createSeat(layout, rowIndex, number))).toList();
    }

    private Seat createSeat(SeatLayout layout, int rowIndex, int number) {
        SeatPosition position = new SeatPosition((char) ('A' + rowIndex), number);
        boolean isVipRow = rowIndex < layout.vipRows();
        return isVipRow ? new VipSeat(position, layout.basePrice()) : new StandardSeat(position, layout.basePrice());
    }
}
