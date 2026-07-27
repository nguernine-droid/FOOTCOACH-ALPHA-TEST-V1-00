ALTER TYPE "public"."match_status" ADD VALUE 'awaiting_confirmation' BEFORE 'finished';--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "score_submitted_by_team_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "score_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "score_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "confirmation_token" text;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_score_submitted_by_team_id_teams_id_fk" FOREIGN KEY ("score_submitted_by_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;