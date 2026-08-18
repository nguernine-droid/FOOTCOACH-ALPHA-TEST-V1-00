ALTER TABLE "matches" ADD COLUMN "home_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "away_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "confirmation_reminded_days" integer;