import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { operators } from "@/db/schema";
import { getTodayField } from "@/lib/daily-field";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [field, claimed] = await Promise.all([
      getTodayField(),
      getDb().select({ count: sql<number>`count(*)::int` }).from(operators),
    ]);
    return NextResponse.json({
      field: {
        date: field.fieldDate,
        opensAt: field.opensAt,
        closesAt: field.closesAt,
        claimedCount: claimed[0]?.count ?? 0,
      },
    }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return jsonError("Today's field is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
