import { NextRequest, NextResponse } from "next/server";

export function jsonError(message: string, status: number, code = "REQUEST_FAILED") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

export function assertTrustedMutation(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredOrigin) return false;

  try {
    return new URL(origin).origin === new URL(configuredOrigin).origin;
  } catch {
    return false;
  }
}
