ALTER TABLE "clubs" ALTER COLUMN "owner_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ALTER COLUMN "affiliation_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "stadium" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "logo_path" text;