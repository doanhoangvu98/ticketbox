package demo.registration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Part 2 (Mockito): a UNIT test. The database and the email service are mocks,
 * PasswordValidator is real because it is pure logic (nothing to isolate).
 */
@ExtendWith(MockitoExtension.class) // creates the @Mock fields and fails the test on unused stubs
class UserServiceTest {

    private static final String STRONG = "Abcdefg1";

    @Mock
    private UserRepository users;
    @Mock
    private EmailSender emails;
    @Captor
    private ArgumentCaptor<User> userCaptor;

    private UserService service;

    @BeforeEach
    void setUp() {
        service = new UserService(users, emails, new PasswordValidator());
    }

    @Test
    void register_savesUser_andSendsWelcomeEmail() {
        // Arrange: tell the mock how to behave (stubbing)
        when(users.existsByEmail("alice@mail.com")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        // Act
        User user = service.register("alice@mail.com", STRONG);

        // Assert: the result ...
        assertThat(user.email()).isEqualTo("alice@mail.com");
        // ... and the interactions (did we really talk to the collaborators?)
        verify(users).save(userCaptor.capture()); // ArgumentCaptor: look at what was passed in
        assertThat(userCaptor.getValue().email()).isEqualTo("alice@mail.com");
        verify(emails).sendWelcome("alice@mail.com");
    }

    @Test
    void weakPassword_isRejected_andNothingHappens() {
        assertThatThrownBy(() -> service.register("bob@mail.com", "123"))
                .isInstanceOf(WeakPasswordException.class);

        verifyNoInteractions(users, emails);
    }

    @Test
    void usedEmail_isRejected_andNoEmailIsSent() {
        when(users.existsByEmail("carol@mail.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register("carol@mail.com", STRONG))
                .isInstanceOf(EmailAlreadyUsedException.class)
                .hasMessageContaining("carol@mail.com");

        verify(users, never()).save(any());
        verifyNoInteractions(emails);
    }

    @Test
    void userIsSavedBeforeWelcomeEmailIsSent() {
        when(users.existsByEmail("dave@mail.com")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        service.register("dave@mail.com", STRONG);

        InOrder order = inOrder(users, emails);
        order.verify(users).save(any(User.class));
        order.verify(emails).sendWelcome("dave@mail.com");
    }
}
