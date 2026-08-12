# RIGYADH

**5,555 rigs. One field.**

RIGYADH is an independent competitive drilling game. Practice is open to everyone. Ranked play requires one permanent operator number from the fixed 0001–5555 field.

## Stack

- Next.js App Router and TypeScript
- Neon Postgres with Drizzle migrations
- Neon Auth for Google and email sign-in
- Zod validation, Postgres-backed rate limiting, signed ranked sessions
- viem address validation for optional, manually entered profile wallets

## Local setup

1. Copy .env.example to .env.local.
2. In Neon Console, copy Connect > Connection string into DATABASE_URL.
3. In Neon Console, copy Auth > Configuration > Auth URL into NEON_AUTH_BASE_URL.
4. Generate the two server-only secrets shown in .env.example.
5. In Neon Auth trusted domains, add http://localhost:3000.
6. Run:

~~~
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
~~~

The seed command is idempotent and inserts exactly the fixed operator range 1–5555.

## Deployment

Deploy the Next.js app to Netlify and configure the same server variables there. For production, set NEXT_PUBLIC_APP_URL to https://rigyadh.buzz.

In Neon Auth, add https://rigyadh.buzz as a trusted domain and disable Allow Localhost for the production environment. Configure production Google OAuth with `{NEON_AUTH_BASE_URL}/callback/google` as the authorized redirect URI, and configure production email delivery for magic links. `NEON_AUTH_COOKIE_SECRET` must be stable and at least 32 characters.

Google and magic-link callbacks return to `/operator?claim=1`. The client refreshes the Neon session before calling protected Operator APIs, then automatically resumes the pending random-number claim. Do not call application APIs to infer auth state; use `authClient.getSession()` in the browser or `auth.getSession()` on the server.

Daily fields rotate automatically at 00:00 UTC; the server derives and stores each day’s seed the first time it is requested.

Public pages use real routes: `/practice`, `/leaderboard`, `/operator`, `/rules`, `/about`, and shareable verified reports at `/result/[id]`. Neon Google or magic-link authentication owns identity; wallets are never used to sign in. An authenticated Operator may manually add a public EVM address to the profile without connecting or signing.

See [the backend handoff](docs/BACKEND_HANDOFF.md) for API and operations details.

This repository uses original interface artwork and is not affiliated with The Saudis or Robinhood.
