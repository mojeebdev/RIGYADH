import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const operatorSlots = pgTable("operator_slots", {
  number: integer("number").primaryKey(),
  status: text("status").default("available").notNull(),
  reservedByUserId: text("reserved_by_user_id"),
  reservedUntil: timestamp("reserved_until", { withTimezone: true }),
  claimedByOperatorId: uuid("claimed_by_operator_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, () => [
  check("operator_slots_number_range", sql.raw('"number" BETWEEN 1 AND 5555')),
]);

export const operators = pgTable("operators", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  number: integer("number").notNull().unique(),
  fieldAlias: text("field_alias").notNull(),
  fieldAliasNormalized: text("field_alias_normalized").notNull().unique(),
  xHandle: text("x_handle"),
  xHandleNormalized: text("x_handle_normalized"),
  walletAddress: text("wallet_address").unique(),
  walletVerifiedAt: timestamp("wallet_verified_at", { withTimezone: true }),
  createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("operators_number_range", sql.raw('"number" BETWEEN 1 AND 5555')),
  uniqueIndex("operators_x_handle_normalized_unique").on(table.xHandleNormalized),
]);

export const operatorClaims = pgTable("operator_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  slotNumber: integer("slot_number").notNull().unique(),
  status: text("status").default("reserved").notNull(),
  reservedAt: timestamp("reserved_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("operator_claims_user_unique").on(table.userId),
]);

export const dailyFields = pgTable("daily_fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  fieldDate: date("field_date").notNull().unique(),
  seed: text("seed").notNull(),
  seedHash: text("seed_hash").notNull(),
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  createdAt,
});

export const rankedRunSessions = pgTable("ranked_run_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id),
  dailyFieldId: uuid("daily_field_id").notNull().references(() => dailyFields.id),
  attemptNumber: integer("attempt_number").notNull(),
  seed: text("seed").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  status: text("status").default("active").notNull(),
  createdAt,
}, (table) => [
  uniqueIndex("ranked_run_sessions_operator_field_attempt").on(table.operatorId, table.dailyFieldId, table.attemptNumber),
]);

export const rankedRuns = pgTable("ranked_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().unique().references(() => rankedRunSessions.id),
  operatorId: uuid("operator_id").notNull().references(() => operators.id),
  dailyFieldId: uuid("daily_field_id").notNull().references(() => dailyFields.id),
  attemptNumber: integer("attempt_number").notNull(),
  depth: integer("depth").notNull(),
  reserve: integer("reserve").notNull(),
  banked: integer("banked").notNull(),
  bestCombo: integer("best_combo").notNull(),
  strikes: integer("strikes").notNull(),
  actionLog: jsonb("action_log").notNull(),
  verified: boolean("verified").default(true).notNull(),
  verificationReason: text("verification_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("ranked_runs_leaderboard_index").on(table.dailyFieldId, table.depth, table.reserve),
]);

export const walletChallenges = pgTable("wallet_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id),
  nonce: text("nonce").notNull().unique(),
  domain: text("domain").notNull(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt,
});

export const rateLimitEvents = pgTable("rate_limit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  bucket: text("bucket").notNull(),
  key: text("key").notNull(),
  createdAt,
}, (table) => [
  index("rate_limit_events_bucket_key_created_index").on(table.bucket, table.key, table.createdAt),
]);
