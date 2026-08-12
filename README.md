# RIGYADH

**5,555 rigs. One field.**

RIGYADH is a competitive push-your-luck drilling game built as an independent community activation concept. Practice is open to everyone; the production version will reserve ranked access for 5,555 permanent Operator IDs claimed through Google or a magic link. Wallet connection lives in the profile and remains optional.

## Frontend status

- Responsive landing and game field
- 45-second pressure-timing gameplay
- Combo, depth, reserve, integrity, and multiplier systems
- Bank Reserve / MAX DRILL checkpoint decision
- Practice result and X Web Intent challenge flow
- Simulated Google and magic-link claim journey
- Operator profile and optional-wallet state
- Simulated leaderboard data clearly labelled

The identity, leaderboard, claim allocation, score verification, and wallet actions are intentionally frontend simulations until the Neon backend phase.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

The proposed service contracts and Neon schema are documented in [`docs/BACKEND_HANDOFF.md`](docs/BACKEND_HANDOFF.md).

This repository uses original interface artwork and is not affiliated with The Saudis or Robinhood.
