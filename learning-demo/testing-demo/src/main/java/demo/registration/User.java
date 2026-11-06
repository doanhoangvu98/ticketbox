package demo.registration;

/** Only the email, on purpose: password hashing is left out to keep the demo small. */
public record User(String email) {
}
