ALTER TABLE "tournaments" ALTER COLUMN "time" SET DEFAULT '09:00';--> statement-breakpoint
ALTER TABLE "announcement_responses" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "response_id" uuid;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "session" text DEFAULT 'day' NOT NULL;--> statement-breakpoint
ALTER TABLE "announcement_responses" ADD CONSTRAINT "announcement_responses_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_response_id_announcement_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."announcement_responses"("id") ON DELETE set null ON UPDATE no action;