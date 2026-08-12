import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/server";
import { assertTrustedMutation, clientKey, jsonError } from "@/lib/http";
import { reserveOperatorSlot } from "@/lib/operators";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertTrustedMutation(request)) return jsonError("Untrusted request origin.", 403, "CSRF_REJECTED");
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in before reserving an operator.", 401, "AUTH_REQUIRED");
    await enforceRateLimit({ bucket: "operator-reserve", key: userId + ":" + clientKey(request), limit: 8, windowSeconds: 3600 });

    const result = await reserveOperatorSlot(userId);
    if (result.kind === "sold_out") return jsonError("All 5,555 operators are claimed.", 409, "SOLD_OUT");
    if (result.kind === "claimed") return NextResponse.json({ operator: result.operator, status: "claimed" });
    return NextResponse.json({
      status: "reserved",
      reservation: {
        number: String(result.reservation.slotNumber).padStart(4, "0"),
        expiresAt: result.reservation.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("Too many reservation attempts. Try again later.", 429, "RATE_LIMITED");
    }
    return jsonError("Operator reservation is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
