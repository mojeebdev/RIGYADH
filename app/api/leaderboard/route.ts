import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { operators, rankedRuns } from "@/db/schema";
import { getTodayField } from "@/lib/daily-field";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
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
      .where(and(eq(rankedRuns.dailyFieldId, field.id), eq(rankedRuns.verified, true)))
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

    return NextResponse.json({ field: field.fieldDate, leaders }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch {
    return jsonError("Leaderboard is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
