import { createHash, createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyFields } from "@/db/schema";

function currentFieldDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function fieldSecret() {
  const secret = process.env.RUN_TOKEN_SECRET;
  if (!secret) throw new Error("RUN_TOKEN_SECRET is not configured.");
  return secret;
}

export async function getTodayField(now = new Date()) {
  const db = getDb();
  const fieldDate = currentFieldDate(now);
  const opensAt = new Date(fieldDate + "T00:00:00.000Z");
  const closesAt = new Date(opensAt.getTime() + 24 * 60 * 60 * 1000);
  const seed = createHmac("sha256", fieldSecret()).update(fieldDate).digest("hex");
  const seedHash = createHash("sha256").update(seed).digest("hex");

  await db.insert(dailyFields).values({
    fieldDate,
    seed,
    seedHash,
    opensAt,
    closesAt,
  }).onConflictDoNothing();

  const [field] = await db.select().from(dailyFields)
    .where(eq(dailyFields.fieldDate, fieldDate))
    .limit(1);

  if (!field) throw new Error("Daily field could not be created.");
  return field;
}
