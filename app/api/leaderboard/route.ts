import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { operators, rankedRuns } from "@/db/schema";
import { getTodayField } from "@/lib/daily-field";
import { clientKey, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit({ bucket: "leaderboard", key: clientKey(request), limit: 120, windowSeconds: 60 });
    const field = await getTodayField();
    const db = getDb();
    const rows = await db.select({
      number: operators.number,
      alias: operators.fieldAlias,
      depth: rankedRuns.depth,
      reserve: rankedRuns.reserve,
      submittedAt: rankedRuns.submittedAt,
    }).from(rankedRuns)
      .innerJoin(operators, eq(rankedRuns.operatorId, operators.id))
      .where(eq(rankedRuns.dailyFieldId, field.id))
      .orderBy(desc(rankedRuns.depth), desc(rankedRuns.reserve), rankedRuns.submittedAt)
      .limit(100);

    const seenOperators = new Set<number>();
    const leaders = rows.filter((row) => {
      if (seenOperators.has(row.number)) return false;
      seenOperators.add(row.number);
      return true;
    }).slice(0, 25).map((row, index) => ({
      rank: index + 1,
      operator: String(row.number).padStart(4, "0"),
      alias: row.alias,
      depth: row.depth,
      reserve: row.reserve,
    }));

    return NextResponse.json({ field: field.fieldDate, leaders });
  } catch {
    return jsonError("Leaderboard is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
