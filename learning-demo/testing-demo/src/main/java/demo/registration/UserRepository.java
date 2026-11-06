package demo.registration;

/** Port to the database. In unit tests we replace it with a Mockito mock. */
public interface UserRepository {

    boolean existsByEmail(String email);

    User save(User user);
}
