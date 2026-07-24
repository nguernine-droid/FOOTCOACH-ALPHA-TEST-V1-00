CREATE TYPE "public"."team_coach_role" AS ENUM('principal', 'adjoint');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'club';--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"email" text,
	"owner_id" uuid NOT NULL,
	"affiliation_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_owner_id_unique" UNIQUE("owner_id"),
	CONSTRAINT "clubs_affiliation_code_unique" UNIQUE("affiliation_code")
);
--> statement-breakpoint
CREATE TABLE "team_coaches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"role" "team_coach_role" DEFAULT 'principal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_coach_id_unique";--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "coach_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "club_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "club_id" uuid;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_coaches" ADD CONSTRAINT "team_coaches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_coaches" ADD CONSTRAINT "team_coaches_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_coaches_team_coach_idx" ON "team_coaches" USING btree ("team_id","coach_id");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill : chaque équipe existante (1 coach via teams.coach_id) obtient sa
-- ligne d'affectation team_coaches en tant que coach principal.
INSERT INTO "team_coaches" ("team_id", "coach_id", "role")
SELECT "id", "coach_id", 'principal' FROM "teams" WHERE "coach_id" IS NOT NULL;