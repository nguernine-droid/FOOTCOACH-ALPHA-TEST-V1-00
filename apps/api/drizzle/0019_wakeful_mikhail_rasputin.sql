CREATE TYPE "public"."match_gender" AS ENUM('masculin', 'feminin', 'mixte');--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "gender" "match_gender";