import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAddress } from "viem";
import { getDb } from "@/db";
import { operators } from "@/db/schema";
import { requireUserId } from "@/lib/auth/server";
import { assertTrustedMutation, clientKey, jsonError } from "@/lib/http";
import { getOperatorForUser } from "@/lib/operators";
import { enforceRateLimit } from "@/lib/rate-limit";

const walletSchema = z.object({ address: z.string().trim().min(1).max(128) });

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertTrustedMutation(request)) return jsonError("Untrusted request origin.", 403, "CSRF_REJECTED");
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Sign in before adding a wallet.", 401, "AUTH_REQUIRED");
    await enforceRateLimit({ bucket: "wallet-save", key: userId + ":" + clientKey(request), limit: 12, windowSeconds: 3600 });

    const { address: rawAddress } = walletSchema.parse(await request.json());
    const address = getAddress(rawAddress);
    const operator = await getOperatorForUser(userId);
    if (!operator) return jsonError("Claim an operator before adding a wallet.", 403, "OPERATOR_REQUIRED");

    const db = getDb();
    const [owner] = await db.select({ id: operators.id }).from(operators)
      .where(eq(operators.walletAddress, address))
      .limit(1);
    if (owner && owner.id !== operator.id) return jsonError("This wallet is already attached to another profile.", 409, "WALLET_IN_USE");

    await db.update(operators).set({ walletAddress: address, walletVerifiedAt: null, updatedAt: new Date() })
      .where(eq(operators.id, operator.id));
    return NextResponse.json({ walletAddress: address, verified: false });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("Too many wallet updates. Try again later.", 429, "RATE_LIMITED");
    }
    if (error instanceof z.ZodError) return jsonError("Enter a valid wallet address.", 400, "INVALID_WALLET");
    return jsonError("Enter a valid EVM wallet address.", 422, "WALLET_REJECTED");
  }
}
