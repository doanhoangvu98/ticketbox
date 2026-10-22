# CLAUDE.md

Guidance for AI coding assistants (Claude, Copilot, ...) working in this repository.
Human-facing docs are in Vietnamese under `docs/`; this file is in English on purpose.

## Before you write any code (continuation protocol)

1. Read `docs/PROGRESS.md` (what is done, current week, known backend/frontend gaps).
2. Read `docs/DOMAIN.md` (business rules; the source of truth) and `docs/weekly/WEEK-<N>.md` for the week you work on.
3. API shapes: `frontend/src/lib/types.ts` + `docs/API.md`. The MSW handlers in `frontend/src/mocks/handlers/`
   are a runnable reference implementation of every endpoint; mirror their rules and error codes.
4. Work order: Junior+ version first (`mvn verify` green, tag `w<N>-basic`), then the Middle items.
5. After finishing: update `PROGRESS.md`, `CHECKLIST.md`, `KNOWLEDGE_MAP.md`, and `DECISIONS.md` for any trade-off.
6. Never implement features scheduled for a later week unless asked.

## Project

TicketBox: event ticketing platform (events, seat maps, timed seat holds, payments, QR tickets).
Learning project following the IBM Java Developer Professional Certificate, target level Junior+ to Middle.
The owner presents weekly demos to a mentor and must be able to explain every line, so
**prefer clear, idiomatic code over clever code**.

## Repository layout

- `backend/ticketbox-core`: pure Java 21 domain (Week 1). **No Spring, no Lombok, no JPA here.**
- `backend/ticketbox-api`: Spring Boot 3.5 REST API (Week 2+). Depends on core.
- `frontend/`: React 19 + Vite + TS (strict) + Tailwind v4 + Remix Icon + axios + TanStack Query + MSW +
  react-toastify. Full UI for 4 roles, runs standalone on MSW mocks (`.env.local`: `VITE_USE_MOCK=true`). See `docs/FRONTEND.md`.
- `docs/`: Vietnamese documentation. Update the relevant doc when behaviour changes.

## Commands

```bash
cd backend
mvn verify                                   # build + all tests
mvn -pl ticketbox-core test                  # core tests only
mvn -pl ticketbox-core exec:java             # Week 1 console demo
docker compose up -d                         # (repo root) PostgreSQL on localhost:5433
cd frontend && npm install && npm run dev    # http://localhost:8000 (mock by default)
mvn -pl ticketbox-api -am spring-boot:run -Dspring-boot.run.profiles=dev
```

## Frontend rules

- Feature folders `src/features/<feature>/{api.ts,components,pages}`; shared UI in `src/components/ui`.
- Components never call axios directly: use hooks from `features/*/api.ts` (TanStack Query, central query keys).
- `src/lib/types.ts` IS the API contract. Changing it means updating `docs/API.md` and the MSW handler too.
- Business constants live in `src/lib/rules.ts` and must match `docs/DOMAIN.md` and backend config.
- Errors: use `ApiError.errorCode` / `fieldErrors`; never parse messages. Notifications via `react-toastify`.
- All visible text via `t('key')`; add to `i18n/locales/vi.ts` first, then `en.ts` (type-checked).
- Every screen must work from 360px wide and in dark mode. Icon-only buttons need `aria-label` (`IconButton`).
- Remix Icon classes (`ri-*-line` default, `ri-*-fill` for emphasis); `brand-*` colours; named exports only.
- Mock layer must stay out of production: only imported dynamically in `main.tsx` when `VITE_USE_MOCK=true`.

## Architecture rules

1. Package by feature in the API (`event/`, `seat/`, `venue/`, `report/`), layered inside:
   `Controller -> Service -> Repository`. Controllers never touch repositories of other features
   except trivial read-only endpoints.
2. Never return JPA entities from controllers. Use `record` DTOs in `<feature>/dto`.
3. Business rules live in entities/domain (`publish()`, `cancel()`), not in controllers.
4. Reuse `ticketbox-core` (SeatMapFactory, enums, exceptions, PricingStrategy) instead of duplicating rules.
5. Errors: throw `BusinessException` subclasses from core; `GlobalExceptionHandler` maps them to
   RFC 7807 ProblemDetail. Do not build error JSON by hand in controllers.
6. Services: class-level `@Transactional(readOnly = true)`, write methods `@Transactional`.
7. `spring.jpa.open-in-view=false`: map entities to DTOs inside the service transaction.

## Coding conventions (summary, full version in docs/CONVENTIONS.md)

- Java 21, 4-space indent, max line length 120, no wildcard imports.
- Constructor injection only (`@RequiredArgsConstructor` + `private final`). No field `@Autowired`.
- Lombok allowed in `ticketbox-api` only: `@Getter`, `@RequiredArgsConstructor`, `@NoArgsConstructor(access = PROTECTED)`, `@Slf4j`.
  **Never `@Data`, `@Setter`, `@EqualsAndHashCode` or `@ToString` on entities.**
- Enums persisted with `@Enumerated(EnumType.STRING)`.
- Money: `BigDecimal`, scale 0 (VND). Never `double` for money.
- Time: `Instant` for technical timestamps, `OffsetDateTime` for event times. Inject `java.time.Clock`.
- Code comments and identifiers in English. Explain *why*, not *what*.

## Database rules

- Schema is owned by Flyway (`ddl-auto=validate`). **Never edit an applied migration**; add `V{n+1}__description.sql`.
- Dev-only seed data lives in `db/seed` (profile `dev`), never in `db/migration`.
- Every new query pattern on a large table: check `EXPLAIN ANALYZE`, record in `docs/BENCHMARK.md`.
- Bulk-inserted tables use SEQUENCE ids with `allocationSize = 50` (batching). IDENTITY for low-volume tables.

## Tests

- Core: JUnit 5 + AssertJ, inject `Clock` (use `MutableClock`), no `Thread.sleep` for time logic.
- API: Mockito unit tests for services, `@WebMvcTest` for HTTP contract. Testcontainers arrives in Week 4.
- Every bug fix comes with a test that fails before the fix.

## When adding a feature

1. Domain rule first (entity/core) + unit test.
2. Service + Mockito test.
3. Controller + DTO + `@WebMvcTest`.
4. Migration if schema changes.
5. Update `docs/API.md`, `docs/KNOWLEDGE_MAP.md`, and `docs/DECISIONS.md` if a trade-off was made.

## Do not

- Add dependencies without a reason written in `docs/DECISIONS.md`.
- Use Spring Boot 4.x (team decision: stay on 3.5.x until the ecosystem settles).
- Introduce features from a later week (see `docs/ROADMAP.md`) unless asked.
