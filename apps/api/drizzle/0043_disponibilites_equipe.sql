CREATE TYPE "public"."availability_venue" AS ENUM('home', 'away', 'any');--> statement-breakpoint
CREATE TABLE "team_availabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"coach_id" uuid,
	"date" date NOT NULL,
	"venue" "availability_venue" DEFAULT 'any' NOT NULL,
	"time" time,
	"accepted_levels" text[] DEFAULT '{}' NOT NULL,
	"radius_km" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_availabilities" ADD CONSTRAINT "team_availabilities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_availabilities" ADD CONSTRAINT "team_availabilities_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_availabilities_team_date_idx" ON "team_availabilities" USING btree ("team_id","date");--> statement-breakpoint
CREATE INDEX "team_availabilities_date_idx" ON "team_availabilities" USING btree ("date");