import { describe, expect, it } from "vitest";
import { parseAuthReturn } from "../lib/auth-return";

describe("Neon Auth return state", () => {
  it("resumes a pending claim and removes callback-only parameters", () => {
    expect(parseAuthReturn("?claim=1&neon_auth_session_verifier=secret", "/operator"))
      .toEqual({ resumeClaim: true, authError: null, hasAuthReturn: true, cleanPath: "/operator" });
  });

  it("preserves unrelated query parameters while exposing auth errors", () => {
    expect(parseAuthReturn("?source=x&auth_error=google", "/operator"))
      .toEqual({ resumeClaim: false, authError: "google", hasAuthReturn: true, cleanPath: "/operator?source=x" });
  });
});
