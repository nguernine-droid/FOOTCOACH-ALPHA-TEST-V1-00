ALTER TABLE "match_announcements" ALTER COLUMN "level" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "match_announcements" ALTER COLUMN "level" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "match_announcements" ALTER COLUMN "level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "level" text;--> statement-breakpoint
DROP TYPE "public"."match_level";