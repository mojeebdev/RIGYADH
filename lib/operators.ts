import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { operatorClaims, operators } from "@/db/schema";

export function normalizeAlias(alias: string) {
  return alias.trim().toUpperCase();
}

export async function getOperatorForUser(userId: string) {
  const db = getDb();
  const [operator] = await db.select().from(operators)
    .where(eq(operators.userId, userId))
    .limit(1);
  return operator ?? null;
}

export async function reserveOperatorSlot(userId: string) {
  const db = getDb();
  const operator = await getOperatorForUser(userId);
  if (operator) return { kind: "claimed" as const, operator };

  const [reservation] = await db.select().from(operatorClaims)
    .where(and(
      eq(operatorClaims.userId, userId),
      eq(operatorClaims.status, "reserved"),
      gt(operatorClaims.expiresAt, new Date()),
    ))
    .limit(1);
  if (reservation) return { kind: "reserved" as const, reservation };

  const result = await db.execute(sql`
    WITH expired_claims AS (
      UPDATE operator_claims
      SET status = 'expired'
      WHERE status = 'reserved' AND expires_at <= now()
      RETURNING slot_number
    ),
    released_slots AS (
      UPDATE operator_slots
      SET status = 'available', reserved_by_user_id = NULL, reserved_until = NULL, updated_at = now()
      WHERE status = 'reserved' AND reserved_until <= now()
      RETURNING number
    ),
    candidate AS (
      SELECT number
      FROM operator_slots
      WHERE status = 'available'
      ORDER BY random()
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    assigned AS (
      UPDATE operator_slots
      SET status = 'reserved',
          reserved_by_user_id = ${userId},
          reserved_until = now() + interval '15 minutes',
          updated_at = now()
      WHERE number = (SELECT number FROM candidate)
      RETURNING number, reserved_until
    )
    INSERT INTO operator_claims (user_id, slot_number, status, reserved_at, expires_at)
    SELECT ${userId}, number, 'reserved', now(), reserved_until FROM assigned
    ON CONFLICT (user_id) DO UPDATE
      SET slot_number = EXCLUDED.slot_number,
          status = 'reserved',
          reserved_at = EXCLUDED.reserved_at,
          expires_at = EXCLUDED.expires_at,
          completed_at = NULL
    RETURNING slot_number, expires_at
  `);

  const row = result.rows[0] as { slot_number: number; expires_at: string | Date } | undefined;
  if (!row) return { kind: "sold_out" as const };
  return {
    kind: "reserved" as const,
    reservation: {
      slotNumber: row.slot_number,
      expiresAt: new Date(row.expires_at),
    },
  };
}

export async function claimReservedOperator(userId: string, alias: string) {
  const db = getDb();
  const existing = await getOperatorForUser(userId);
  if (existing) return { kind: "claimed" as const, operator: existing };

  const normalizedAlias = normalizeAlias(alias);
  const result = await db.execute(sql`
    WITH active_claim AS (
      SELECT slot_number
      FROM operator_claims
      WHERE user_id = ${userId}
        AND status = 'reserved'
        AND expires_at > now()
      FOR UPDATE
    ),
    created_operator AS (
      INSERT INTO operators (user_id, number, field_alias, field_alias_normalized)
      SELECT ${userId}, slot_number, ${normalizedAlias}, ${normalizedAlias}
      FROM active_claim
      RETURNING id, number, field_alias
    ),
    claimed_slot AS (
      UPDATE operator_slots
      SET status = 'claimed',
          reserved_by_user_id = NULL,
          reserved_until = NULL,
          claimed_by_operator_id = (SELECT id FROM created_operator),
          updated_at = now()
      WHERE number = (SELECT number FROM created_operator)
      RETURNING number
    )
    UPDATE operator_claims
    SET status = 'claimed', completed_at = now()
    WHERE user_id = ${userId}
      AND slot_number = (SELECT number FROM claimed_slot)
    RETURNING (SELECT id FROM created_operator) AS id,
              (SELECT number FROM created_operator) AS number,
              (SELECT field_alias FROM created_operator) AS field_alias
  `);

  const row = result.rows[0] as { id: string; number: number; field_alias: string } | undefined;
  if (!row?.id) return { kind: "reservation_required" as const };
  return {
    kind: "claimed" as const,
    operator: {
      id: row.id,
      userId,
      number: row.number,
      fieldAlias: row.field_alias,
    },
  };
}
