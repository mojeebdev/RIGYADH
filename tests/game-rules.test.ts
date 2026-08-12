import { describe, expect, it } from "vitest";
import { replayRankedRun } from "../lib/game-rules";

describe("ranked run replay", () => {
  it("replays the same timestamped actions deterministically", () => {
    const actions = [
      { type: "drill" as const, atMs: 1000 },
      { type: "drill" as const, atMs: 1500 },
      { type: "drill" as const, atMs: 2200 },
    ];

    expect(replayRankedRun("field-seed", actions)).toEqual(replayRankedRun("field-seed", actions));
  });

  it("rejects inputs faster than the human action interval", () => {
    const result = replayRankedRun("field-seed", [
      { type: "drill", atMs: 1000 },
      { type: "drill", atMs: 1050 },
    ]);

    expect(result).toMatchObject({ valid: false, reason: expect.stringContaining("faster") });
  });

  it("rejects checkpoint commands outside a checkpoint", () => {
    const result = replayRankedRun("field-seed", [{ type: "bank", atMs: 1000 }]);
    expect(result).toMatchObject({ valid: false, reason: expect.stringContaining("checkpoint") });
  });
});
