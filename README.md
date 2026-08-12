# RIGYADH

**5,555 rigs. One field.**

RIGYADH is an independent competitive drilling game. Practice is open to everyone. Ranked play requires one permanent operator number from the fixed 0001–5555 field.

## Stack

- Next.js App Router and TypeScript
- Neon Postgres with Drizzle migrations
- Neon Auth for Google and email sign-in
- Zod validation, Postgres-backed rate limiting, signed ranked sessions
- viem wallet-message verification only; RIGYADH never requests transactions, approvals, or funds

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

Deploy the Next.js app to Vercel and configure the same server variables there. For production, set NEXT_PUBLIC_APP_URL to https://rigyadh.buzz and WALLET_CHALLENGE_DOMAIN to rigyadh.buzz.

In Neon Auth, add https://rigyadh.buzz as a trusted domain and disable Allow Localhost for the production environment. Before launch, enable email verification and replace shared Google keys with your own Google OAuth credentials.

Daily fields rotate automatically at 00:00 UTC; the server derives and stores each day’s seed the first time it is requested.

See [the backend handoff](docs/BACKEND_HANDOFF.md) for API and operations details.

This repository uses original interface artwork and is not affiliated with The Saudis or Robinhood.
