CREATE TYPE "public"."point_reason" AS ENUM('rencontre', 'sos');--> statement-breakpoint
-- Matchs restés en attente de la contre-signature du score, qui n'existe plus :
-- sans cela ils y resteraient pour toujours, plus aucune route ne pouvant les
-- clore. Sous la nouvelle règle, un score saisi suffit à clore le match — et
-- ces lignes en ont bien un. Les scores ne sont pas touchés.
UPDATE "matches" SET "status" = 'finished' WHERE "status" = 'awaiting_confirmation';--> statement-breakpoint
CREATE TABLE "coach_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"reason" "point_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "encounter_token" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "encounter_token_coach_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "encounter_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "encounter_confirmed_by_coach_id" uuid;--> statement-breakpoint
ALTER TABLE "coach_points" ADD CONSTRAINT "coach_points_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_points" ADD CONSTRAINT "coach_points_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coach_points_match_coach_idx" ON "coach_points" USING btree ("match_id","coach_id");--> statement-breakpoint
CREATE INDEX "coach_points_coach_idx" ON "coach_points" USING btree ("coach_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_encounter_token_coach_id_users_id_fk" FOREIGN KEY ("encounter_token_coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_encounter_confirmed_by_coach_id_users_id_fk" FOREIGN KEY ("encounter_confirmed_by_coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;