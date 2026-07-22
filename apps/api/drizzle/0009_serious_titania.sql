CREATE TYPE "public"."join_request_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"child_user_id" uuid,
	"status" "join_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "join_code" text;--> statement-breakpoint
DO $$
DECLARE t record; c text; i int;
BEGIN
  FOR t IN SELECT id FROM teams WHERE join_code IS NULL LOOP
    LOOP
      c := '';
      FOR i IN 1..6 LOOP
        c := c || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random()*31)::int + 1, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE join_code = c);
    END LOOP;
    UPDATE teams SET join_code = c WHERE id = t.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "join_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_child_user_id_users_id_fk" FOREIGN KEY ("child_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "join_requests_pending_user_idx" ON "join_requests" USING btree ("user_id") WHERE status = 'pending';--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_join_code_unique" UNIQUE("join_code");