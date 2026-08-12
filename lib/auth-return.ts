const AUTH_RETURN_KEYS = ["claim", "auth_error", "neon_auth_session_verifier"] as const;

export function parseAuthReturn(search: string, pathname: string) {
  const params = new URLSearchParams(search);
  const resumeClaim = params.get("claim") === "1";
  const authError = params.get("auth_error");
  const hasAuthReturn = AUTH_RETURN_KEYS.some((key) => params.has(key));

  for (const key of AUTH_RETURN_KEYS) params.delete(key);
  const query = params.toString();
  return {
    resumeClaim,
    authError,
    hasAuthReturn,
    cleanPath: pathname + (query ? `?${query}` : ""),
  };
}
