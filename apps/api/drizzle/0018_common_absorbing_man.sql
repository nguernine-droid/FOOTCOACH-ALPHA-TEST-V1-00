CREATE TYPE "public"."withdrawal_reason" AS ENUM('blessure', 'meteo', 'terrain', 'personnel');--> statement-breakpoint
ALTER TYPE "public"."match_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_announcement_id_unique";--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "is_sos" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "sos_reason" "withdrawal_reason";--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "sos_details" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "withdrawn_by_team_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "withdrawal_reason" "withdrawal_reason";--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "withdrawal_details" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_withdrawn_by_team_id_teams_id_fk" FOREIGN KEY ("withdrawn_by_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;