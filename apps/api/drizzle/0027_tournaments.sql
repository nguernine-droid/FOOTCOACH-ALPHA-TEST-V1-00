CREATE TYPE "public"."tournament_registration_status" AS ENUM('registered', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('open', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."point_reason" ADD VALUE 'tournoi';--> statement-breakpoint
ALTER TYPE "public"."point_reason" ADD VALUE 'organisation';--> statement-breakpoint
CREATE TABLE "tournament_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"status" "tournament_registration_status" DEFAULT 'registered' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_in_by_coach_id" uuid,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"end_date" date,
	"time" time NOT NULL,
	"city" text NOT NULL,
	"stadium" text NOT NULL,
	"category" text NOT NULL,
	"gender" "match_gender",
	"level" "match_level" DEFAULT 'loisir' NOT NULL,
	"format" "match_format" DEFAULT '8v8' NOT NULL,
	"slots" integer NOT NULL,
	"poster_path" text,
	"comment" text,
	"status" "tournament_status" DEFAULT 'open' NOT NULL,
	"is_sos" boolean DEFAULT false NOT NULL,
	"sos_reason" "withdrawal_reason",
	"sos_details" text,
	"sos_alerted_at" timestamp with time zone,
	"sos_widened_at" timestamp with time zone,
	"encounter_token" text,
	"encounter_token_coach_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "coach_points_match_coach_idx";--> statement-breakpoint
ALTER TABLE "coach_points" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_points" ADD COLUMN "tournament_id" uuid;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_checked_in_by_coach_id_users_id_fk" FOREIGN KEY ("checked_in_by_coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_encounter_token_coach_id_users_id_fk" FOREIGN KEY ("encounter_token_coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_registrations_tournament_team_idx" ON "tournament_registrations" USING btree ("tournament_id","team_id");--> statement-breakpoint
CREATE INDEX "tournaments_sos_pending_relay_idx" ON "tournaments" USING btree ("sos_alerted_at") WHERE is_sos and sos_widened_at is null;--> statement-breakpoint
ALTER TABLE "coach_points" ADD CONSTRAINT "coach_points_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coach_points_tournament_coach_idx" ON "coach_points" USING btree ("tournament_id","coach_id") WHERE tournament_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "coach_points_match_coach_idx" ON "coach_points" USING btree ("match_id","coach_id") WHERE match_id is not null;--> statement-breakpoint
ALTER TABLE "coach_points" ADD CONSTRAINT "coach_points_une_origine" CHECK ((match_id is not null) <> (tournament_id is not null));