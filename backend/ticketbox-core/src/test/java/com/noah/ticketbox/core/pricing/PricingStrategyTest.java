package com.noah.ticketbox.core.pricing;

import com.noah.ticketbox.core.domain.SeatPosition;
import com.noah.ticketbox.core.domain.StandardSeat;
import com.noah.ticketbox.core.domain.VipSeat;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PricingStrategyTest {

    private final StandardSeat standard = new StandardSeat(SeatPosition.parse("B1"), new BigDecimal("100000"));
    private final VipSeat vip = new VipSeat(SeatPosition.parse("A1"), new BigDecimal("100000"));

    @Test
    void seatPrice_isPolymorphic() {
        PricingStrategy pricing = PricingStrategy.seatPrice();

        assertThat(pricing.priceOf(standard)).isEqualByComparingTo("100000");
        assertThat(pricing.priceOf(vip)).isEqualByComparingTo("150000");
    }

    @Test
    void strategiesCompose_inOrder() {
        PricingStrategy pricing = PricingStrategy.seatPrice()
                .withDiscountPercent(10)                 // 150000 -> 135000
                .withServiceFee(new BigDecimal("5000")); // 135000 -> 140000

        assertThat(pricing.priceOf(vip)).isEqualByComparingTo("140000");
    }

    @Test
    void anyLambdaIsAStrategy() {
        PricingStrategy flat = seat -> new BigDecimal("99000");

        assertThat(flat.priceOf(vip)).isEqualByComparingTo("99000");
    }

    @Test
    void composingDoesNotMutateOriginal() {
        PricingStrategy base = PricingStrategy.seatPrice();
        base.withDiscountPercent(50);

        assertThat(base.priceOf(standard)).isEqualByComparingTo("100000");
    }

    @Test
    void rejectsInvalidDiscount() {
        assertThatThrownBy(() -> PricingStrategy.seatPrice().withDiscountPercent(120))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
