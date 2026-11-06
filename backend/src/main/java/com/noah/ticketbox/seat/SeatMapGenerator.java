package com.noah.ticketbox.seat;

import com.noah.ticketbox.event.EventEntity;
import com.noah.ticketbox.venue.VenueEntity;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

/**
 * Builds the seats of a new event: venue shape (rows x seats) + event pricing (first vipRows rows
 * are VIP).
 */
@Component
public class SeatMapGenerator {

  static final BigDecimal VIP_MULTIPLIER = new BigDecimal("1.5");

  public List<SeatEntity> generate(EventEntity event) {
    VenueEntity venue = event.getVenue();
    BigDecimal vipPrice =
        event.getBasePrice().multiply(VIP_MULTIPLIER).setScale(0, RoundingMode.HALF_UP);
    return IntStream.range(0, venue.getTotalRows())
        .boxed()
        .flatMap(
            row ->
                IntStream.rangeClosed(1, venue.getSeatsPerRow())
                    .mapToObj(
                        number ->
                            row < event.getVipRows()
                                ? new SeatEntity(
                                    event, (char) ('A' + row), number, SeatType.VIP, vipPrice)
                                : new SeatEntity(
                                    event,
                                    (char) ('A' + row),
                                    number,
                                    SeatType.STANDARD,
                                    event.getBasePrice())))
        .toList();
  }
}
