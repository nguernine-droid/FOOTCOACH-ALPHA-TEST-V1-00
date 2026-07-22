CREATE TYPE "public"."player_position" AS ENUM('gardien', 'defenseur', 'milieu', 'attaquant');--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "position" "player_position";--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "jersey_number" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "position" "player_position";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "jersey_number" integer;