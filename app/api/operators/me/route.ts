import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rankedRunSessions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/server";
import { getTodayField } from "@/lib/daily-field";
import { jsonError } from "@/lib/http";
import { getOperatorForUser } from "@/lib/operators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in to view an operator.", 401, "AUTH_REQUIRED");

    const operator = await getOperatorForUser(userId);
    if (!operator) return NextResponse.json({ operator: null, attemptsRemaining: 3 }, {
      headers: { "Cache-Control": "private, no-store" },
    });
    const field = await getTodayField();
    const [attempts] = await getDb().select({ count: sql<number>`count(*)::int` })
      .from(rankedRunSessions)
      .where(and(
        eq(rankedRunSessions.operatorId, operator.id),
        eq(rankedRunSessions.dailyFieldId, field.id),
      ));
    return NextResponse.json({ operator, attemptsRemaining: Math.max(0, 3 - (attempts?.count ?? 0)) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return jsonError("Operator profile is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
