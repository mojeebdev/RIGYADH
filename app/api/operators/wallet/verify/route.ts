import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAddress, verifyMessage } from "viem";
import { getDb } from "@/db";
import { operators, walletChallenges } from "@/db/schema";
import { requireUserId } from "@/lib/auth/server";
import { assertTrustedMutation, clientKey, jsonError } from "@/lib/http";
import { getOperatorForUser } from "@/lib/operators";
import { enforceRateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  address: z.string().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertTrustedMutation(request)) return jsonError("Untrusted request origin.", 403, "CSRF_REJECTED");
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in before verifying a wallet.", 401, "AUTH_REQUIRED");
    await enforceRateLimit({ bucket: "wallet-verify", key: userId + ":" + clientKey(request), limit: 8, windowSeconds: 3600 });
    const payload = verifySchema.parse(await request.json());
    const address = getAddress(payload.address);
    const operator = await getOperatorForUser(userId);
    if (!operator) return jsonError("Claim an operator before linking a wallet.", 403, "OPERATOR_REQUIRED");

    const db = getDb();
    const [challenge] = await db.select().from(walletChallenges).where(and(
      eq(walletChallenges.id, payload.challengeId),
      eq(walletChallenges.operatorId, operator.id),
      gt(walletChallenges.expiresAt, new Date()),
      isNull(walletChallenges.usedAt),
    )).limit(1);
    if (!challenge) return jsonError("Wallet challenge expired or was already used.", 409, "CHALLENGE_UNAVAILABLE");

    const valid = await verifyMessage({ address, message: challenge.message, signature: payload.signature as `0x${string}` });
    if (!valid) return jsonError("Wallet signature could not be verified.", 422, "SIGNATURE_REJECTED");

    const [owner] = await db.select({ id: operators.id }).from(operators)
      .where(eq(operators.walletAddress, address))
      .limit(1);
    if (owner && owner.id !== operator.id) return jsonError("This wallet is already linked.", 409, "WALLET_IN_USE");

    await db.update(operators).set({ walletAddress: address, walletVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(operators.id, operator.id));
    await db.update(walletChallenges).set({ usedAt: new Date() })
      .where(eq(walletChallenges.id, challenge.id));
    return NextResponse.json({ walletAddress: address });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("Too many verification attempts. Try again later.", 429, "RATE_LIMITED");
    }
    if (error instanceof z.ZodError) return jsonError("Wallet verification details are invalid.", 400, "INVALID_WALLET");
    return jsonError("Wallet verification failed.", 422, "WALLET_REJECTED");
  }
}
