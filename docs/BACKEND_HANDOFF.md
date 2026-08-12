# RIGYADH backend handoff

## Architecture

Neon Auth owns the neon_auth schema and its Google/email identity records. RIGYADH owns the Drizzle-managed application tables:

- operator_slots: the immutable range 1–5555
- operators and operator_claims
- daily_fields
- ranked_run_sessions and ranked_runs
- wallet_challenges
- rate_limit_events

No Auth.js tables or credentials are used.

## API

| Route | Purpose |
| --- | --- |
| GET /api/field/today | Public current-field metadata |
| POST /api/operators/reserve | Authenticated 15-minute random slot reservation |
| POST /api/operators/claim | Authenticated permanent operator claim |
| GET /api/operators/me | Current operator profile |
| POST /api/operators/wallet/challenge | Creates a ten-minute wallet signature challenge |
| POST /api/operators/wallet/verify | Verifies the challenge signature and stores checksummed address |
| POST /api/runs/start | Starts one signed, 45-second ranked session |
| POST /api/runs/submit | Replays timestamped actions and stores the verified result |
| GET /api/leaderboard?field=today | Current daily leaderboard |

POST routes require same-origin requests and an authenticated Neon session. Rate-limit events live in Postgres and are protected with an advisory lock per bucket/key.

## Ranked integrity

The browser receives a signed, short-lived session token plus a field seed. It submits only timestamped actions; it never submits final depth or reserve values. The server rejects altered, expired, or duplicate sessions; action bursts below 80ms; invalid checkpoint commands; and action logs that cannot be replayed with the shared deterministic rules.

Each started ranked session counts toward the daily maximum of three attempts. Practice remains local, unlimited, and unranked.

## Production checklist

1. Put production values in Vercel: DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, RUN_TOKEN_SECRET, NEXT_PUBLIC_APP_URL=https://rigyadh.buzz, and WALLET_CHALLENGE_DOMAIN=rigyadh.buzz.
2. In Neon Auth, allow https://rigyadh.buzz; use http://localhost:3000 only in development.
3. Run migrations and seed against a Neon development branch first.
4. Create the production Neon branch/database, migrate it, then run npm run db:seed.
5. Use Neon’s managed Google/email configuration. Move off shared Google keys before public launch.
6. Run npm run lint, npm run typecheck, npm test, and npm run build before each release.

Wallet linking proves address control through a signed message only. Do not add transaction, approval, payment, or token-transfer code to this flow.
