package demo.registration;

/** Pure logic, no dependencies: the easiest kind of code to unit test (and to TDD). */
public class PasswordValidator {

    private static final int MIN_LENGTH = 8;

    /** A strong password has 8+ characters, at least one digit and at least one uppercase letter. */
    public boolean isStrong(String password) {
        if (password == null) { // cycle 4
            return false;
        }
        return password.length() >= MIN_LENGTH // cycle 1
                && containsDigit(password) // cycle 2
                && containsUpperCase(password); // cycle 3
    }

    // Extracted during the REFACTOR step; the tests stayed green the whole time.
    private static boolean containsDigit(String text) {
        return text.chars().anyMatch(Character::isDigit);
    }

    private static boolean containsUpperCase(String text) {
        return text.chars().anyMatch(Character::isUpperCase);
    }
}
