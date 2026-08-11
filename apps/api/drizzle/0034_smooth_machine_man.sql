CREATE TYPE "public"."feedback_status" AS ENUM('nouveau', 'en_cours', 'resolu', 'refuse');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('bug', 'suggestion');--> statement-breakpoint
CREATE TABLE "coach_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"type" "feedback_type" NOT NULL,
	"message" text NOT NULL,
	"status" "feedback_status" DEFAULT 'nouveau' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "coach_feedback" ADD CONSTRAINT "coach_feedback_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_feedback_author_idx" ON "coach_feedback" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "coach_feedback_status_idx" ON "coach_feedback" USING btree ("status","created_at");