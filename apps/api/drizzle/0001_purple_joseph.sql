CREATE TYPE "public"."booking_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "carpool_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "license_plate" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "driver_license_number" text;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;