import { createHmac, timingSafeEqual } from "node:crypto";

type RunTokenPayload = {
  sessionId: string;
  operatorId: string;
  fieldId: string;
  attemptNumber: number;
  expiresAt: number;
};

function secret() {
  const value = process.env.RUN_TOKEN_SECRET;
  if (!value) throw new Error("RUN_TOKEN_SECRET is not configured.");
  return value;
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createRunToken(payload: RunTokenPayload) {
  const body = encode(JSON.stringify(payload));
  return body + "." + signature(body);
}

export function readRunToken(token: string): RunTokenPayload | null {
  const [body, providedSignature, ...rest] = token.split(".");
  if (!body || !providedSignature || rest.length > 0) return null;

  const expectedSignature = signature(body);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RunTokenPayload;
    if (!payload.sessionId || !payload.operatorId || !payload.fieldId || !Number.isInteger(payload.attemptNumber)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hashRunToken(token: string) {
  return createHmac("sha256", secret()).update(token).digest("hex");
}
