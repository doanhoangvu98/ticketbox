package com.noah.ticketbox.core.domain;

import com.noah.ticketbox.core.support.TestFixtures;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SeatMapFactoryTest {

    private final SeatMapFactory factory = new SeatMapFactory();

    @Test
    void createsOneSeatPerPosition() {
        List<Seat> seats = factory.create(TestFixtures.smallLayout());

        assertThat(seats).hasSize(12);
        assertThat(seats).extracting(Seat::position).doesNotHaveDuplicates();
    }

    @Test
    void firstRowsAreVipAndCostMore() {
        List<Seat> seats = factory.create(TestFixtures.smallLayout());

        Seat a1 = seats.get(0);
        Seat b1 = seats.get(4);
        assertThat(a1).isInstanceOf(VipSeat.class);
        assertThat(b1).isInstanceOf(StandardSeat.class);
        assertThat(a1.price()).isEqualByComparingTo(new BigDecimal("150000"));
        assertThat(b1.price()).isEqualByComparingTo(new BigDecimal("100000"));
    }
}
