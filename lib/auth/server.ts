import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 300,
  },
  logLevel: process.env.NODE_ENV === "production" ? "warn" : "debug",
});

export async function requireUserId() {
  const { data: session } = await auth.getSession();
  return session?.user?.id ?? null;
}
