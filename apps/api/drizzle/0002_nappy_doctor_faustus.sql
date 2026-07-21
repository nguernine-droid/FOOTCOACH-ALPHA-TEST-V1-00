CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"team_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"first_name" text,
	"last_name" text,
	"player_user_id" uuid,
	"used_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_player_user_id_users_id_fk" FOREIGN KEY ("player_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;