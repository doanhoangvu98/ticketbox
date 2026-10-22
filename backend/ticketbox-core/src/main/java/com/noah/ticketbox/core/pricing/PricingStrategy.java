package com.noah.ticketbox.core.pricing;

import com.noah.ticketbox.core.domain.Seat;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.function.UnaryOperator;

/**
 * Strategy pattern + functional interface.
 *
 * <p>Because it has exactly one abstract method, any lambda {@code seat -> ...} or method reference
 * {@code Seat::price} is a PricingStrategy. Default methods let strategies be <b>composed</b>
 * (higher-order functions), the same idea as {@code Function.andThen}:
 *
 * <pre>{@code
 * PricingStrategy pricing = PricingStrategy.seatPrice()
 *         .withDiscountPercent(10)
 *         .withServiceFee(new BigDecimal("5000"));
 * }</pre>
 */
@FunctionalInterface
public interface PricingStrategy {

    BigDecimal priceOf(Seat seat);

    /** Base strategy: the seat's own price (polymorphic: StandardSeat vs VipSeat). */
    static PricingStrategy seatPrice() {
        return Seat::price;
    }

    /** Applies an extra adjustment on top of this strategy. Returns a NEW strategy (immutability). */
    default PricingStrategy andThen(UnaryOperator<BigDecimal> adjustment) {
        Objects.requireNonNull(adjustment);
        return seat -> adjustment.apply(this.priceOf(seat));
    }

    default PricingStrategy withDiscountPercent(int percent) {
        if (percent < 0 || percent > 100) {
            throw new IllegalArgumentException("percent must be 0..100");
        }
        BigDecimal factor = BigDecimal.valueOf(100 - percent).movePointLeft(2);
        return andThen(price -> price.multiply(factor).setScale(0, RoundingMode.HALF_UP));
    }

    default PricingStrategy withServiceFee(BigDecimal fee) {
        Objects.requireNonNull(fee);
        return andThen(price -> price.add(fee));
    }
}
