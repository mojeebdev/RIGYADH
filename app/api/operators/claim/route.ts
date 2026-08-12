import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/server";
import { assertTrustedMutation, clientKey, jsonError } from "@/lib/http";
import { claimReservedOperator } from "@/lib/operators";
import { enforceRateLimit } from "@/lib/rate-limit";

const claimSchema = z.object({
  alias: z.string().trim().regex(/^[A-Za-z0-9_-]{3,16}$/),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertTrustedMutation(request)) return jsonError("Untrusted request origin.", 403, "CSRF_REJECTED");
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in before claiming an operator.", 401, "AUTH_REQUIRED");
    await enforceRateLimit({ bucket: "operator-claim", key: userId + ":" + clientKey(request), limit: 12, windowSeconds: 3600 });
    const payload = claimSchema.parse(await request.json());
    const result = await claimReservedOperator(userId, payload.alias);
    if (result.kind === "reservation_required") {
      return jsonError("Reserve an operator before claiming it.", 409, "RESERVATION_REQUIRED");
    }
    return NextResponse.json({ operator: result.operator }, { status: result.kind === "claimed" ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("Too many claim attempts. Try again later.", 429, "RATE_LIMITED");
    }
    if (error instanceof z.ZodError) return jsonError("Use 3-16 letters, numbers, dashes, or underscores.", 400, "INVALID_ALIAS");
    return jsonError("That field alias is unavailable.", 409, "ALIAS_UNAVAILABLE");
  }
}
