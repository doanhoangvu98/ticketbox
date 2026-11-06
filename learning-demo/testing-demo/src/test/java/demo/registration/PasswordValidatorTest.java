package demo.registration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Part 1 (JUnit) + Part 3 (TDD).
 *
 * <p>Written test-first, one rule at a time: Red -> Green -> Refactor.
 * Each test below was one TDD cycle (see the comments in PasswordValidator).
 */
class PasswordValidatorTest {

    private final PasswordValidator validator = new PasswordValidator();

    // Cycle 1: the first rule is "at least 8 characters".
    @Test
    @DisplayName("accepts a strong password")
    void acceptsStrongPassword() {
        assertThat(validator.isStrong("Abcdefg1")).isTrue();
    }

    @Test
    @DisplayName("rejects a password shorter than 8 characters")
    void rejectsShortPassword() {
        assertThat(validator.isStrong("Ab1")).isFalse();
    }

    // Cycles 2 and 3: one parameterized test, one row per rule (JUnit 5).
    @ParameterizedTest(name = "\"{0}\" is weak: {1}")
    @CsvSource({
            "Abcdefgh, no digit",
            "abcdefg1, no uppercase letter"
    })
    void rejectsPasswordMissingARule(String password, String reason) {
        assertThat(validator.isStrong(password)).isFalse();
    }

    // Cycle 4: bad input must not crash, it is simply "not strong".
    @ParameterizedTest(name = "[{index}] \"{0}\" is not strong")
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void rejectsNullEmptyAndBlank(String password) {
        assertThat(validator.isStrong(password)).isFalse();
    }
}
