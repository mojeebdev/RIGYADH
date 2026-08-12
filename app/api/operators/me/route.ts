import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/server";
import { jsonError } from "@/lib/http";
import { getOperatorForUser } from "@/lib/operators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in to view an operator.", 401, "AUTH_REQUIRED");

    const operator = await getOperatorForUser(userId);
    return NextResponse.json({ operator });
  } catch {
    return jsonError("Operator profile is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
