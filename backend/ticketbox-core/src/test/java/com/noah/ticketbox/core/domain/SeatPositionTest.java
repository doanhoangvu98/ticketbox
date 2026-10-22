package com.noah.ticketbox.core.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SeatPositionTest {

    @Test
    void parse_isCaseInsensitive() {
        assertThat(SeatPosition.parse("b12")).isEqualTo(new SeatPosition('B', 12));
    }

    @Test
    void sortsByRowThenNumericNumber() {
        List<String> sorted = Stream.of("B1", "A10", "A2", "A1")
                .map(SeatPosition::parse)
                .sorted()
                .map(SeatPosition::code)
                .toList();

        assertThat(sorted).containsExactly("A1", "A2", "A10", "B1");
    }

    @Test
    void rejectsInvalidRow() {
        assertThatThrownBy(() -> new SeatPosition('1', 1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void equalPositionsHaveEqualHashCodes() {
        assertThat(new SeatPosition('A', 1)).hasSameHashCodeAs(SeatPosition.parse("A1"));
    }
}
