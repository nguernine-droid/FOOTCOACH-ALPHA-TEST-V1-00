CREATE TYPE "public"."referee_by" AS ENUM('tbd', 'home', 'away', 'official');--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "referee_by" "referee_by" DEFAULT 'tbd' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "referee_name" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "changing_rooms" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "day_before_reminded_at" timestamp with time zone;