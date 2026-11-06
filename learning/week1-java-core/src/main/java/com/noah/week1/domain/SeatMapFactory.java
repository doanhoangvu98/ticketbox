package com.noah.week1.domain;

import java.util.List;
import java.util.stream.IntStream;

/** Builds the seats of an event: venue shape + event pricing. Callers never decide which Seat subclass to use. */
public final class SeatMapFactory {

    public List<Seat> create(SeatLayout layout, SeatPricing pricing) {
        if (pricing.vipRows() > layout.rows()) {
            throw new IllegalArgumentException("vipRows exceeds venue rows");
        }
        return IntStream.range(0, layout.rows())
                .boxed()
                .flatMap(row -> IntStream.rangeClosed(1, layout.seatsPerRow())
                        .mapToObj(number -> createSeat(row, number, pricing)))
                .toList();
    }

    private Seat createSeat(int rowIndex, int number, SeatPricing pricing) {
        SeatPosition position = new SeatPosition((char) ('A' + rowIndex), number);
        return rowIndex < pricing.vipRows()
                ? new VipSeat(position, pricing.basePrice())
                : new StandardSeat(position, pricing.basePrice());
    }
}
