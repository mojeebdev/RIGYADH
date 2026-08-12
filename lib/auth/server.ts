import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL || "https://neon-auth.not-configured.invalid";
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET || "not-configured-not-configured-not-configured";

export const neonAuthConfigured = Boolean(process.env.NEON_AUTH_BASE_URL);

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
  },
});

export async function requireUserId() {
  if (!neonAuthConfigured) {
    throw new Error("NEON_AUTH_BASE_URL is not configured.");
  }

  const { data: session } = await auth.getSession();
  return session?.user?.id ?? null;
}
