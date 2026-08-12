import { sql } from "drizzle-orm";
import { getDb } from "@/db";

type RateLimit = {
  bucket: string;
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function enforceRateLimit({ bucket, key, limit, windowSeconds }: RateLimit) {
  const db = getDb();
  const result = await db.execute(sql`
    WITH locked AS (
      SELECT pg_advisory_xact_lock(hashtext(${bucket} || ':' || ${key})) AS acquired
    ),
    pruned AS (
      DELETE FROM rate_limit_events
      USING locked
      WHERE bucket = ${bucket}
        AND key = ${key}
        AND created_at <= now() - (${windowSeconds} * interval '1 second')
    ),
    recent AS (
      SELECT count(*)::int AS request_count
      FROM rate_limit_events, locked
      WHERE bucket = ${bucket}
        AND key = ${key}
        AND created_at > now() - (${windowSeconds} * interval '1 second')
    ),
    inserted AS (
      INSERT INTO rate_limit_events (bucket, key)
      SELECT ${bucket}, ${key}
      FROM locked
      WHERE (SELECT request_count FROM recent) < ${limit}
      RETURNING id
    )
    SELECT EXISTS(SELECT 1 FROM inserted) AS allowed
  `);

  const allowedValue = (result.rows[0] as { allowed: boolean | string }).allowed;
  const allowed = allowedValue === true || allowedValue === "true" || allowedValue === "t";
  if (!allowed) {
    throw new Error("RATE_LIMITED");
  }
}
