package demo.registration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Part 4 (Integration testing): NO mocks. Real UserService + real PasswordValidator + real repository,
 * wired together exactly like in production. We assert on the final STATE of the system.
 *
 * <p>The only fake is the email service, because we cannot send real emails from a test.
 * In the real project the next step is a real PostgreSQL via Testcontainers (Week 4).
 */
class RegistrationFlowIntegrationTest {

    private InMemoryUserRepository users;
    private FakeEmailSender emails;
    private UserService service;

    @BeforeEach
    void setUp() {
        users = new InMemoryUserRepository();
        emails = new FakeEmailSender();
        service = new UserService(users, emails, new PasswordValidator());
    }

    @Test
    void happyPath_userIsStored_andWelcomed() {
        service.register("alice@mail.com", "Abcdefg1");

        assertThat(users.existsByEmail("alice@mail.com")).isTrue();
        assertThat(emails.sentTo()).containsExactly("alice@mail.com");
    }

    @Test
    void sameEmailCannotRegisterTwice_andGetsNoSecondEmail() {
        service.register("bob@mail.com", "Abcdefg1");

        assertThatThrownBy(() -> service.register("bob@mail.com", "Another1Pass"))
                .isInstanceOf(EmailAlreadyUsedException.class);

        assertThat(emails.sentTo()).hasSize(1);
    }

    @Test
    void weakPassword_thenRetryWithStrongOne_succeeds() {
        assertThatThrownBy(() -> service.register("carol@mail.com", "weak"))
                .isInstanceOf(WeakPasswordException.class);
        assertThat(users.existsByEmail("carol@mail.com")).isFalse();
        assertThat(emails.sentTo()).isEmpty();

        service.register("carol@mail.com", "Str0ngPassword");

        assertThat(users.existsByEmail("carol@mail.com")).isTrue();
        assertThat(emails.sentTo()).containsExactly("carol@mail.com");
    }
}
