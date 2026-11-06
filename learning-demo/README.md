# learning-demo

Small standalone examples used for learning sessions and presentations.
Nothing here depends on the TicketBox code in `backend/`.

## testing-demo

JUnit 5, Mockito, TDD and integration testing, shown on one simple example: **user registration**.

| Test class | Topic | What to look at |
|---|---|---|
| `PasswordValidatorTest` | JUnit 5 + TDD | parameterized tests, test-first cycles (see comments in `PasswordValidator`) |
| `UserServiceTest` | Mockito | `@Mock`, `when`, `verify`, `never`, `ArgumentCaptor`, `InOrder` |
| `RegistrationFlowIntegrationTest` | Integration | real objects, no mocks, a `FakeEmailSender` |

Run (Java 21 required):

```bash
cd learning-demo/testing-demo
mvn test
```
