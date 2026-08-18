CREATE TYPE "public"."availability_notice_kind" AS ENUM('suggestion', 'free_weekend');--> statement-breakpoint
CREATE TABLE "availability_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kind" "availability_notice_kind" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_free_weekend" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_notices" ADD CONSTRAINT "availability_notices_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_notices_team_date_kind_idx" ON "availability_notices" USING btree ("team_id","date","kind");