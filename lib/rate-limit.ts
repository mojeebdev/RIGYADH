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
      SELECT pg_advisory_xact_lock(hashtext(${bucket} || ':' || ${key}))
    ),
    inserted AS (
      INSERT INTO rate_limit_events (bucket, key)
      SELECT ${bucket}, ${key} FROM locked
      RETURNING created_at
    )
    SELECT count(*)::int AS request_count
    FROM rate_limit_events
    WHERE bucket = ${bucket}
      AND key = ${key}
      AND created_at > now() - (${windowSeconds} * interval '1 second')
  `);

  const count = Number((result.rows[0] as { request_count: number | string }).request_count);
  if (count > limit) {
    throw new Error("RATE_LIMITED");
  }
}
