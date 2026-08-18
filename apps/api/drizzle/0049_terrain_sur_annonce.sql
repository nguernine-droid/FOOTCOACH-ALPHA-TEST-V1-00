ALTER TABLE "match_announcements" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "venue_lat" double precision;--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "venue_lng" double precision;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "venue_id" uuid;