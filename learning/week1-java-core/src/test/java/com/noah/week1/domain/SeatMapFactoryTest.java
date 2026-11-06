package com.noah.week1.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SeatMapFactoryTest {

    private final SeatMapFactory factory = new SeatMapFactory();
    private final SeatPricing pricing = new SeatPricing(new BigDecimal("100000"), 1);

    @Test
    void createsOneSeatPerPosition_firstRowsVip() {
        List<Seat> seats = factory.create(new SeatLayout(3, 4), pricing);

        assertThat(seats).hasSize(12).extracting(Seat::position).doesNotHaveDuplicates();
        assertThat(seats.get(0)).isInstanceOf(VipSeat.class);
        assertThat(seats.get(0).price()).isEqualByComparingTo("150000");
        assertThat(seats.get(4)).isInstanceOf(StandardSeat.class);
        assertThat(seats.get(4).price()).isEqualByComparingTo("100000");
    }

    @Test
    void rejectsMoreVipRowsThanVenueRows() {
        assertThatThrownBy(() -> factory.create(new SeatLayout(1, 4), new SeatPricing(BigDecimal.TEN, 2)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
