import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { walletChallenges } from "@/db/schema";
import { requireUserId } from "@/lib/auth/server";
import { assertTrustedMutation, clientKey, jsonError } from "@/lib/http";
import { getOperatorForUser } from "@/lib/operators";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertTrustedMutation(request)) return jsonError("Untrusted request origin.", 403, "CSRF_REJECTED");
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in before linking a wallet.", 401, "AUTH_REQUIRED");
    await enforceRateLimit({ bucket: "wallet-challenge", key: userId + ":" + clientKey(request), limit: 6, windowSeconds: 3600 });

    const operator = await getOperatorForUser(userId);
    if (!operator) return jsonError("Claim an operator before linking a wallet.", 403, "OPERATOR_REQUIRED");
    const nonce = randomBytes(24).toString("hex");
    const domain = process.env.WALLET_CHALLENGE_DOMAIN || "rigyadh.buzz";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const message = [
      "RIGYADH wallet link",
      "Domain: " + domain,
      "Operator: #" + String(operator.number).padStart(4, "0"),
      "Nonce: " + nonce,
      "Expires: " + expiresAt.toISOString(),
    ].join("\\n");

    const db = getDb();
    const [challenge] = await db.insert(walletChallenges).values({
      operatorId: operator.id,
      nonce,
      domain,
      message,
      expiresAt,
    }).returning({ id: walletChallenges.id, message: walletChallenges.message, expiresAt: walletChallenges.expiresAt });
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("Too many wallet challenges. Try again later.", 429, "RATE_LIMITED");
    }
    return jsonError("Wallet challenge is unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
