package demo.registration;

import java.util.HashMap;
import java.util.Map;

/** A real (simple) implementation, used by the integration test instead of a mock. */
public class InMemoryUserRepository implements UserRepository {

    private final Map<String, User> users = new HashMap<>();

    @Override
    public boolean existsByEmail(String email) {
        return users.containsKey(email);
    }

    @Override
    public User save(User user) {
        users.put(user.email(), user);
        return user;
    }
}
