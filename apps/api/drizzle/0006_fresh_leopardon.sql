ALTER TABLE "attendances" ADD COLUMN "departure_time" time;--> statement-breakpoint
ALTER TABLE "attendances" ADD COLUMN "departure_area" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "lng" double precision;