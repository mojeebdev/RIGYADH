# RIGYADH backend handoff

Preserve the current gameplay and visual behavior while replacing simulated identity and leaderboard state.

## Approved identity flow

1. Anyone can play practice without authentication.
2. A player signs in with Google or email magic link to claim ranked access.
3. The server atomically assigns one available number from `0001–5555`.
4. The authenticated user chooses one unique Field Alias.
5. The optional wallet-link action is available from the profile only.
6. One auth user can own only one Operator ID. Operator numbers cannot be rerolled.

## Suggested tables

`operators`: UUID primary key, unique auth user ID, unique Operator number constrained to 1–5555, unique 16-character Field Alias, optional X handle, optional unique wallet, wallet verification time, creation time.

`daily_fields`: UUID primary key, unique field date, seed hash, start and end times.

`ranked_runs`: Operator and daily-field foreign keys, depth, banked reserve, best combo, JSON input log, verification status, creation time.

`operator_claims`: unique auth user ID, unique reserved number, expiry time, completion time.

## Required API boundaries

- `GET /api/field/today`
- `POST /api/operators/reserve`
- `POST /api/operators/claim`
- `GET /api/operators/me`
- `POST /api/operators/wallet/challenge`
- `POST /api/operators/wallet/verify`
- `POST /api/runs/start`
- `POST /api/runs/submit`
- `GET /api/leaderboard?field=today`

## Security and integrity requirements

- Use a transaction or row-level lock when allocating an Operator number.
- Do not accept browser-calculated scores as authoritative.
- Issue a signed run token and replay timestamped drill inputs server-side.
- Rate-limit magic-link, claim, run-start, and run-submit endpoints.
- Validate Cloudflare Turnstile server-side during claim.
- Allow three ranked attempts per Operator per daily field; keep practice unlimited.
- Never award attempts or points for likes, follows, replies, or reposts on X.
