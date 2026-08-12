# RIGYADH backend handoff

## Architecture

Neon Auth owns the neon_auth schema and its Google/email identity records. RIGYADH owns the Drizzle-managed application tables:

- operator_slots: the immutable range 1–5555
- operators and operator_claims
- daily_fields
- ranked_run_sessions and ranked_runs
- rate_limit_events

No Auth.js tables or credentials are used.

## API

| Route | Purpose |
| --- | --- |
| GET /api/field/today | Public current-field metadata |
| POST /api/operators/reserve | Authenticated 15-minute random slot reservation |
| POST /api/operators/claim | Authenticated permanent operator claim |
| GET /api/operators/me | Current operator profile |
| POST /api/operators/wallet | Validates and saves a manually entered profile wallet address |
| POST /api/runs/start | Starts one signed, 45-second ranked session |
| POST /api/runs/submit | Replays timestamped actions and stores the verified result |
| GET /api/leaderboard?field=today | Current daily leaderboard |

POST routes require same-origin requests and an authenticated Neon session. Rate-limit events live in Postgres, are protected with an advisory lock per bucket/key, are capped at the configured request count, and prune expired events for each active key.

The browser establishes auth state with `authClient.getSession()` before calling `/api/operators/*`. Google and magic-link callbacks preserve `claim=1`, refresh the Neon session, and continue directly to reservation or the existing Operator profile. Expected signed-out states never probe protected application routes.

## Ranked integrity

The browser receives a signed, short-lived session token plus a field seed. It submits only timestamped actions; it never submits final depth or reserve values. The server rejects altered, expired, or duplicate sessions; action bursts below 80ms; invalid checkpoint commands; and action logs that cannot be replayed with the shared deterministic rules.

Each started ranked session counts toward the daily maximum of three attempts. Practice remains local, unlimited, and unranked.

## Production checklist

1. Put production values in Netlify: DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, RUN_TOKEN_SECRET, and NEXT_PUBLIC_APP_URL=https://rigyadh.buzz.
2. In Neon Auth, allow https://rigyadh.buzz; use http://localhost:3000 only in development. Register `{NEON_AUTH_BASE_URL}/callback/google` in the production Google OAuth client.
3. Run migrations and seed against a Neon development branch first.
4. Create the production Neon branch/database, migrate it, then run npm run db:seed.
5. Use custom production Google OAuth credentials and production email delivery for magic links; shared development credentials are not a public-launch configuration.
6. Run npm run lint, npm run typecheck, npm test, and npm run build before each release.

The optional wallet is a manually entered profile detail and does not prove address ownership. Authentication remains Neon Google or magic link. Do not add WalletConnect, transaction, approval, payment, or token-transfer code to this flow.
