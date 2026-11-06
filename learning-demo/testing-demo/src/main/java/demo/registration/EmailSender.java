package demo.registration;

/** Port to an email service. We never send a real email from a test. */
public interface EmailSender {

    void sendWelcome(String email);
}
