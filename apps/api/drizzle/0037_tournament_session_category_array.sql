ALTER TABLE "tournaments" ALTER COLUMN "category" SET DATA TYPE text[] USING ARRAY["category"];--> statement-breakpoint
ALTER TABLE "tournaments" DROP COLUMN "time";--> statement-breakpoint
ALTER TABLE "tournaments" DROP COLUMN "level";