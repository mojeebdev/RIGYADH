CREATE TABLE "daily_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_date" date NOT NULL,
	"seed" text NOT NULL,
	"seed_hash" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_fields_field_date_unique" UNIQUE("field_date")
);
--> statement-breakpoint
CREATE TABLE "operator_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"slot_number" integer NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "operator_claims_slot_number_unique" UNIQUE("slot_number")
);
--> statement-breakpoint
CREATE TABLE "operator_slots" (
	"number" integer PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"reserved_by_user_id" text,
	"reserved_until" timestamp with time zone,
	"claimed_by_operator_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"number" integer NOT NULL,
	"field_alias" text NOT NULL,
	"field_alias_normalized" text NOT NULL,
	"x_handle" text,
	"x_handle_normalized" text,
	"wallet_address" text,
	"wallet_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "operators_number_unique" UNIQUE("number"),
	CONSTRAINT "operators_field_alias_normalized_unique" UNIQUE("field_alias_normalized"),
	CONSTRAINT "operators_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "ranked_run_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"daily_field_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"seed" text NOT NULL,
	"token_hash" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ranked_run_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "ranked_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"daily_field_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"depth" integer NOT NULL,
	"reserve" integer NOT NULL,
	"banked" integer NOT NULL,
	"best_combo" integer NOT NULL,
	"strikes" integer NOT NULL,
	"action_log" jsonb NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"verification_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ranked_runs_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"nonce" text NOT NULL,
	"domain" text NOT NULL,
	"message" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_challenges_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
ALTER TABLE "ranked_run_sessions" ADD CONSTRAINT "ranked_run_sessions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_run_sessions" ADD CONSTRAINT "ranked_run_sessions_daily_field_id_daily_fields_id_fk" FOREIGN KEY ("daily_field_id") REFERENCES "public"."daily_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_runs" ADD CONSTRAINT "ranked_runs_session_id_ranked_run_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ranked_run_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_runs" ADD CONSTRAINT "ranked_runs_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_runs" ADD CONSTRAINT "ranked_runs_daily_field_id_daily_fields_id_fk" FOREIGN KEY ("daily_field_id") REFERENCES "public"."daily_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_challenges" ADD CONSTRAINT "wallet_challenges_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "operator_claims_user_unique" ON "operator_claims" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operators_x_handle_normalized_unique" ON "operators" USING btree ("x_handle_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "ranked_run_sessions_operator_field_attempt" ON "ranked_run_sessions" USING btree ("operator_id","daily_field_id","attempt_number");--> statement-breakpoint
CREATE INDEX "ranked_runs_leaderboard_index" ON "ranked_runs" USING btree ("daily_field_id","depth","reserve");--> statement-breakpoint
CREATE INDEX "rate_limit_events_bucket_key_created_index" ON "rate_limit_events" USING btree ("bucket","key","created_at");
