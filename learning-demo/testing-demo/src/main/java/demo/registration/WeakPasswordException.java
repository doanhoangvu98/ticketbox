package demo.registration;

public class WeakPasswordException extends RuntimeException {

    public WeakPasswordException() {
        super("Password needs 8+ characters, a digit and an uppercase letter");
    }
}
