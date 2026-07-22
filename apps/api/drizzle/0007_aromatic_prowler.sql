CREATE TYPE "public"."response_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "announcement_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"status" "response_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "away_coach_can_edit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "announcement_responses" ADD CONSTRAINT "announcement_responses_announcement_id_match_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."match_announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_responses" ADD CONSTRAINT "announcement_responses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_responses_ann_team_idx" ON "announcement_responses" USING btree ("announcement_id","team_id");