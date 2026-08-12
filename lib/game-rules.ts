export type RunAction = {
  type: "drill" | "bank" | "max";
  atMs: number;
};

export type VerifiedRun = {
  depth: number;
  reserve: number;
  banked: number;
  bestCombo: number;
  strikes: number;
  integrity: number;
  valid: boolean;
  reason?: string;
};

type State = Omit<VerifiedRun, "valid" | "reason"> & {
  unbanked: number;
  combo: number;
  multiplier: number;
  targetStart: number;
  targetWidth: number;
  checkpointAt: number;
  checkpointOpen: boolean;
};

const RUN_DURATION_MS = 45_000;
const MIN_ACTION_GAP_MS = 80;

function seededRandom(seed: string) {
  let value = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    value = Math.imul(value ^ seed.charCodeAt(index), 3432918353);
    value = (value << 13) | (value >>> 19);
  }

  return () => {
    value = Math.imul(value ^ (value >>> 16), 2246822507);
    value = Math.imul(value ^ (value >>> 13), 3266489909);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  };
}

function failure(reason: string): VerifiedRun {
  return { depth: 0, reserve: 0, banked: 0, bestCombo: 0, strikes: 0, integrity: 0, valid: false, reason };
}

export function replayRankedRun(seed: string, actions: RunAction[]): VerifiedRun {
  const random = seededRandom(seed);
  const state: State = {
    depth: 0,
    reserve: 0,
    banked: 0,
    bestCombo: 0,
    strikes: 0,
    integrity: 100,
    unbanked: 0,
    combo: 0,
    multiplier: 1,
    targetStart: 0.36,
    targetWidth: 0.2,
    checkpointAt: 1000,
    checkpointOpen: false,
  };
  let lastAtMs = -MIN_ACTION_GAP_MS;

  for (const action of actions) {
    if (!Number.isInteger(action.atMs) || action.atMs < 0 || action.atMs > RUN_DURATION_MS) {
      return failure("Action timestamp is outside the run window.");
    }
    if (action.atMs - lastAtMs < MIN_ACTION_GAP_MS) {
      return failure("Actions were submitted faster than a human input interval.");
    }
    lastAtMs = action.atMs;

    if (state.integrity <= 0) return failure("Action occurred after a blowout.");
    if (action.type === "bank") {
      if (!state.checkpointOpen) return failure("Reserve banking is only allowed at a checkpoint.");
      state.banked += state.unbanked;
      state.unbanked = 0;
      state.checkpointOpen = false;
      continue;
    }
    if (action.type === "max") {
      if (!state.checkpointOpen) return failure("MAX DRILL is only allowed at a checkpoint.");
      state.multiplier = Math.min(4, state.multiplier + 0.5);
      state.targetWidth = Math.max(0.065, state.targetWidth - 0.02);
      state.checkpointOpen = false;
      continue;
    }
    if (state.checkpointOpen) return failure("Drilling is paused until the checkpoint decision.");

    const speed = 0.00052 + state.multiplier * 0.00008;
    const position = (Math.sin(action.atMs * speed * Math.PI * 2) + 1) / 2;
    const hit = position >= state.targetStart && position <= state.targetStart + state.targetWidth;
    if (hit) {
      state.combo += 1;
      state.depth += Math.round(105 + state.combo * 19 * state.multiplier);
      state.unbanked += Math.round((90 + state.combo * 24) * state.multiplier);
      state.integrity = Math.min(100, state.integrity + 3);
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.strikes += 1;
      state.targetWidth = Math.max(0.075, state.targetWidth - 0.007);
      state.targetStart = 0.08 + random() * (0.84 - state.targetWidth);
      if (state.depth >= state.checkpointAt) {
        state.checkpointAt += 1000;
        state.checkpointOpen = true;
      }
    } else {
      state.integrity = Math.max(0, state.integrity - 34);
      state.combo = 0;
      state.unbanked = Math.round(state.unbanked * 0.68);
    }
  }

  if (state.integrity > 0) state.banked += state.unbanked;
  return {
    depth: state.depth,
    reserve: state.banked,
    banked: state.banked,
    bestCombo: state.bestCombo,
    strikes: state.strikes,
    integrity: state.integrity,
    valid: true,
  };
}
