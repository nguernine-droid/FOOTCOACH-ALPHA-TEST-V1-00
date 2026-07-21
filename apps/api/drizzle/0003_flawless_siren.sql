CREATE TABLE "lineups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"player_user_id" uuid NOT NULL,
	"pos_x" integer NOT NULL,
	"pos_y" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_player_user_id_users_id_fk" FOREIGN KEY ("player_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lineups_match_player_idx" ON "lineups" USING btree ("match_id","player_user_id");