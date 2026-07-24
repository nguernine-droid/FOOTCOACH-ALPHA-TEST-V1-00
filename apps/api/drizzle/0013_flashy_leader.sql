CREATE TABLE "club_affiliation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"club_id" uuid NOT NULL,
	"status" "join_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "club_affiliation_requests" ADD CONSTRAINT "club_affiliation_requests_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_affiliation_requests" ADD CONSTRAINT "club_affiliation_requests_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "club_affiliation_pending_coach_idx" ON "club_affiliation_requests" USING btree ("coach_id") WHERE status = 'pending';