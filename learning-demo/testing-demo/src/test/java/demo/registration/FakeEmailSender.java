package demo.registration;

import java.util.ArrayList;
import java.util.List;

/**
 * A FAKE (a tiny working implementation), not a mock: it has real behaviour (it remembers what was sent)
 * and no expectations. Integration tests use fakes for things we cannot run for real (an email server).
 */
class FakeEmailSender implements EmailSender {

    private final List<String> sentTo = new ArrayList<>();

    @Override
    public void sendWelcome(String email) {
        sentTo.add(email);
    }

    List<String> sentTo() {
        return sentTo;
    }
}
