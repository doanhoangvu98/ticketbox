package demo.registration;

/**
 * Registers a new user. It has two collaborators we do not want in a unit test
 * (database + email service), so they are injected as interfaces.
 */
public class UserService {

    private final UserRepository users;
    private final EmailSender emails;
    private final PasswordValidator passwordValidator;

    public UserService(UserRepository users, EmailSender emails, PasswordValidator passwordValidator) {
        this.users = users;
        this.emails = emails;
        this.passwordValidator = passwordValidator;
    }

    public User register(String email, String password) {
        if (!passwordValidator.isStrong(password)) {
            throw new WeakPasswordException();
        }
        if (users.existsByEmail(email)) {
            throw new EmailAlreadyUsedException(email);
        }

        User saved = users.save(new User(email));
        emails.sendWelcome(email); // after save: never welcome someone we failed to store
        return saved;
    }
}
