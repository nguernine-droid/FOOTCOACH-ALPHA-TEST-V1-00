CREATE TYPE "public"."coach_category" AS ENUM('joker', 'contributeur');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coach_categories" "coach_category"[] DEFAULT '{}' NOT NULL;