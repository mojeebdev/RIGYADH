import { createHmac, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { rankedRunSessions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/server";
import { getTodayField } from "@/lib/daily-field";
import { assertTrustedMutation, clientKey, jsonError } from "@/lib/http";
import { getOperatorForUser } from "@/lib/operators";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createRunToken, hashRunToken } from "@/lib/run-token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertTrustedMutation(request)) return jsonError("Untrusted request origin.", 403, "CSRF_REJECTED");
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in to start a ranked run.", 401, "AUTH_REQUIRED");
    await enforceRateLimit({ bucket: "ranked-run-start", key: userId + ":" + clientKey(request), limit: 8, windowSeconds: 3600 });

    const operator = await getOperatorForUser(userId);
    if (!operator) return jsonError("Claim an operator before entering ranked play.", 403, "OPERATOR_REQUIRED");
    const field = await getTodayField();
    const db = getDb();
    const [attempts] = await db.select({ count: sql<number>`count(*)::int` })
      .from(rankedRunSessions)
      .where(and(
        eq(rankedRunSessions.operatorId, operator.id),
        eq(rankedRunSessions.dailyFieldId, field.id),
      ));
    const attemptNumber = attempts.count + 1;
    if (attemptNumber > 3) return jsonError("All three ranked attempts are used for today.", 409, "ATTEMPTS_EXHAUSTED");

    const sessionId = randomUUID();
    const runSeed = createHmac("sha256", field.seed).update(sessionId).digest("hex");
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 90_000);
    const token = createRunToken({
      sessionId,
      operatorId: operator.id,
      fieldId: field.id,
      attemptNumber,
      expiresAt: expiresAt.getTime(),
    });
    await db.insert(rankedRunSessions).values({
      id: sessionId,
      operatorId: operator.id,
      dailyFieldId: field.id,
      attemptNumber,
      seed: runSeed,
      tokenHash: hashRunToken(token),
      startedAt,
      expiresAt,
    });

    return NextResponse.json({
      run: {
        token,
        seed: runSeed,
        attemptNumber,
        attemptsRemaining: 3 - attemptNumber,
        startsAt: startedAt,
        expiresAt,
        durationMs: 45_000,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("Too many ranked-run requests. Try again later.", 429, "RATE_LIMITED");
    }
    return jsonError("Ranked play is temporarily unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
