import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rankedRuns, rankedRunSessions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/server";
import { replayRankedRun } from "@/lib/game-rules";
import { assertTrustedMutation, clientKey, jsonError } from "@/lib/http";
import { getOperatorForUser } from "@/lib/operators";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashRunToken, readRunToken } from "@/lib/run-token";

const submissionSchema = z.object({
  token: z.string().min(32).max(4096),
  actions: z.array(z.object({
    type: z.enum(["drill", "bank", "max"]),
    atMs: z.number().int().min(0).max(45_000),
  })).max(300),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertTrustedMutation(request)) return jsonError("Untrusted request origin.", 403, "CSRF_REJECTED");
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in to submit a ranked run.", 401, "AUTH_REQUIRED");
    await enforceRateLimit({ bucket: "ranked-run-submit", key: userId + ":" + clientKey(request), limit: 12, windowSeconds: 3600 });
    const payload = submissionSchema.parse(await request.json());
    const token = readRunToken(payload.token);
    if (!token || token.expiresAt < Date.now()) return jsonError("This ranked session has expired.", 401, "SESSION_EXPIRED");

    const operator = await getOperatorForUser(userId);
    if (!operator || operator.id !== token.operatorId) return jsonError("Ranked session ownership could not be verified.", 403, "SESSION_REJECTED");

    const db = getDb();
    const [session] = await db.select().from(rankedRunSessions)
      .where(and(
        eq(rankedRunSessions.id, token.sessionId),
        eq(rankedRunSessions.operatorId, operator.id),
        eq(rankedRunSessions.dailyFieldId, token.fieldId),
        eq(rankedRunSessions.attemptNumber, token.attemptNumber),
        eq(rankedRunSessions.tokenHash, hashRunToken(payload.token)),
        eq(rankedRunSessions.status, "active"),
        isNull(rankedRunSessions.submittedAt),
      ))
      .limit(1);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return jsonError("This ranked session is expired or already submitted.", 409, "SESSION_UNAVAILABLE");
    }

    const verified = replayRankedRun(session.seed, payload.actions);
    if (!verified.valid) return jsonError(verified.reason ?? "Run could not be reproduced.", 422, "RUN_REJECTED");

    await db.insert(rankedRuns).values({
      sessionId: session.id,
      operatorId: operator.id,
      dailyFieldId: session.dailyFieldId,
      attemptNumber: session.attemptNumber,
      depth: verified.depth,
      reserve: verified.reserve,
      banked: verified.banked,
      bestCombo: verified.bestCombo,
      strikes: verified.strikes,
      actionLog: payload.actions,
    });
    await db.update(rankedRunSessions).set({
      status: "submitted",
      submittedAt: new Date(),
    }).where(eq(rankedRunSessions.id, session.id));

    return NextResponse.json({ run: verified }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("Too many submission attempts. Try again later.", 429, "RATE_LIMITED");
    }
    if (error instanceof z.ZodError) return jsonError("Run actions were invalid.", 400, "INVALID_ACTIONS");
    return jsonError("Ranked run submission failed.", 409, "SUBMISSION_REJECTED");
  }
}
