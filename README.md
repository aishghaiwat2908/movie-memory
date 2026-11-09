# Movie Memory

Movie Memory is a personal screening room. Sign in with Google, save a favorite movie, and see a behind-the-scenes fact about it. Returning users go straight to their dashboard.

**Variant A — Backend-focused.** Fact generation is a paid external operation that can be triggered by a refresh or several tabs at once. A database-backed cache and transaction guard let PostgreSQL coordinate those requests across app instances.

## Run locally

Use Node.js 22.13+ (Node 24 LTS recommended), npm, and PostgreSQL. Docker Compose is convenient for a local database.

1. Run `npm ci` to install dependencies and generate the Prisma client.
2. Copy `.env.example` to `.env` and fill in the values below.
3. Run `docker compose up -d --wait db`, or create a database on an existing PostgreSQL server and update `DATABASE_URL`.
4. Run `npm run db:migrate` to apply the checked-in initial migration.
5. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

In Google Cloud Console, configure the OAuth consent screen and create a **Web application** OAuth client. Register `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI. If the consent screen is in Testing mode, add the Google accounts you plan to use as test users. For a deployment, register its HTTPS callback and set `NEXTAUTH_URL` to that deployment's origin.

| Environment variable | Value |
| --- | --- |
| `DATABASE_URL` | Direct PostgreSQL connection string. The example matches the Compose service. |
| `NEXTAUTH_URL` | Canonical app origin, such as `http://localhost:3000`. |
| `NEXTAUTH_SECRET` | Stable, randomly generated secret. Run `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` to create one. |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret. |
| `OPENAI_API_KEY` | OpenAI project API key with access to the configured model. |
| `OPENAI_MODEL` | Optional model override. Defaults to `gpt-5.4-mini`. |

The app and Prisma CLI both read `.env` locally. Keep it out of Git and set the same variables through your host's secrets configuration when deploying. For schema changes, run `npx prisma migrate dev --name <change>` against a development database and commit the generated SQL. Apply checked-in migrations in deployment with `npm run db:migrate`. Run `npm run build` and then `npm start` to serve the production build.

## Architecture

### Authentication and onboarding

Next.js App Router renders the landing, onboarding and dashboard pages on the server. NextAuth handles Google's OAuth exchange and signs the user in with an encrypted session token. At login the JWT callback upserts an app user using Google's stable subject identifier, then writes the app user's ID to the token. The dashboard reads name, email and photo from the Google profile carried by the session. It uses a generic name and initial when profile details are missing.

After sign-in, `/` checks the database. A null favorite routes to `/onboarding`, and a saved favorite routes to `/dashboard`. Both protected pages check the session and redirect signed-out visitors to the landing page. The onboarding server action trims the title, enforces 1–120 characters and rejects control characters. Its update matches the authenticated user's ID and a null favorite. If two tabs submit concurrently, the first successful update wins.

### Data model

`User` owns one nullable favorite title. The unique Google subject keeps account identity stable even if the user's email changes. `Fact` belongs to a user and records the exact title used for generation, the fact text, and the database insertion time. The composite index on user ID, title, timestamp and ID supports the latest-fact lookup with deterministic ordering. Deleting a user cascades to their facts. A text title keeps onboarding simple and allows a release year to disambiguate remakes.

### Fact requests and cache

The dashboard requests a fact with a same-origin `POST /api/fact`. The route authenticates the session and ignores any caller-supplied user or movie identifiers. It returns a private, non-cacheable response. The browser displays loading, success, fallback and retry states. POST keeps server rendering, browser prefetches and link previews from generating facts.

Within a Prisma transaction, the service takes a PostgreSQL `FOR UPDATE` lock on the user's row, reads the favorite title, and queries the latest fact for that user and title. At Read Committed isolation, a request waiting on the lock can read the preceding request's committed fact after the lock releases. The database clock determines freshness. A fact younger than 60 seconds is reused, and one exactly 60 seconds old is eligible for regeneration. A new fact gets its timestamp when PostgreSQL inserts it, so time spent waiting for OpenAI does not shorten its cache window.

If a fact is absent or expired, the server sends just the title to OpenAI's Responses API. It requests concise plain text, sets `store: false`, imposes a six-second deadline and disables SDK retries. React renders the response as text. On provider failure, the app returns the latest saved fact for that same user and title, or a friendly 503 with a retry button. Failure leaves the saved fact's timestamp intact.

## Tradeoffs

- The row lock serializes work for one user across replicas and keeps each successful insert atomic. It holds a pool connection during the provider call. Pool acquisition, lock wait, provider work and the overall transaction are bounded. A wait that exceeds the lock budget returns a retryable 503.
- Stale facts remain usable during a provider outage. Later requests can retry generation, so a sustained outage can still produce sequential attempts. A process crash or timeout after the provider accepts a request can also result in a later paid retry.
- Facts are model-generated and can be inaccurate. The prompt allows the model to decline an uncertain answer. There is no movie-catalog lookup or independent fact verification.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

The tests cover title validation, cache reuse at 59,999 ms, regeneration at 60,000 ms, provider failure, unauthenticated requests, cross-origin requests, and user isolation even if another ID is supplied. The automated suite mocks the session, provider and database calls, so it runs without credentials.

A local smoke test also exercised the production app with PostgreSQL, signed test sessions and a stubbed OpenAI endpoint. Five parallel requests produced one provider call and one database row. The same run checked expiry, outage fallback, user isolation, browser onboarding and sign-out.

For a live smoke test, sign in with a Google test account, save a title, and check that the dashboard shows the profile and a fact. Refresh in multiple tabs within 60 seconds and confirm there is still one fact for that user and title in `npx prisma studio`. After 60 seconds, refresh and confirm a second row. Sign out and revisit `/dashboard` to check the redirect.

## With two more hours

- Add a PostgreSQL integration test to CI for simultaneous requests, including a slow provider and an expired saved fact.
- Add a short failure cooldown and structured metrics for cache hits, provider latency and lock timeouts. Use those measurements to decide whether a job queue would be worthwhile.

## AI usage

- Codex used the assignment brief to plan and implement the TypeScript application, UI, schema, migration, and tests.
- Codex consulted official documentation for Google OAuth, NextAuth, Prisma transactions and the OpenAI Responses API, then used local test and build results to revise the implementation and setup instructions.

## References

- [NextAuth Google provider](https://next-auth.js.org/providers/google)
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [PostgreSQL row-level locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)
- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses)

