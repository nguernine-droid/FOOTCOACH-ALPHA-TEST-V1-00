CREATE TYPE "public"."match_format" AS ENUM('5v5', '8v8', '11v11');--> statement-breakpoint
CREATE TYPE "public"."match_level" AS ENUM('loisir', 'competition');--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "level" "match_level" DEFAULT 'loisir' NOT NULL;--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "format" "match_format" DEFAULT '11v11' NOT NULL;