import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyFields, operators, rankedRuns } from "@/db/schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getPublicResult(id: string) {
  if (!UUID_PATTERN.test(id)) return null;
  const [result] = await getDb().select({
    id: rankedRuns.id,
    operatorNumber: operators.number,
    alias: operators.fieldAlias,
    fieldDate: dailyFields.fieldDate,
    attemptNumber: rankedRuns.attemptNumber,
    depth: rankedRuns.depth,
    reserve: rankedRuns.reserve,
    bestCombo: rankedRuns.bestCombo,
    strikes: rankedRuns.strikes,
    submittedAt: rankedRuns.submittedAt,
  }).from(rankedRuns)
    .innerJoin(operators, eq(rankedRuns.operatorId, operators.id))
    .innerJoin(dailyFields, eq(rankedRuns.dailyFieldId, dailyFields.id))
    .where(eq(rankedRuns.id, id))
    .limit(1);
  return result ?? null;
}
