import { NextRequest, NextResponse } from "next/server";
import { getTodayField } from "@/lib/daily-field";
import { clientKey, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit({ bucket: "field-today", key: clientKey(request), limit: 120, windowSeconds: 60 });
    const field = await getTodayField();
    return NextResponse.json({
      field: {
        date: field.fieldDate,
        opensAt: field.opensAt,
        closesAt: field.closesAt,
      },
    });
  } catch {
    return jsonError("Today's field is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
