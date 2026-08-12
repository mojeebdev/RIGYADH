import { sql } from "drizzle-orm";
import { getDb } from ".";

async function seed() {
  const db = getDb();
  await db.execute(sql.raw(
    "INSERT INTO operator_slots (number, status) SELECT value, 'available' FROM generate_series(1, 5555) AS value ON CONFLICT (number) DO NOTHING",
  ));
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
