CREATE TYPE "public"."location_source" AS ENUM('gps', 'address');--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location_label" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location_source" "location_source";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "radar_radius_km" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_new_announcement" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_announcement_response" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_response_decision" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_score" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;