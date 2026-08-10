CREATE TABLE "conversation_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_a_id" uuid NOT NULL,
	"coach_b_id" uuid NOT NULL,
	"match_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_paire_ordonnee" CHECK (coach_a_id < coach_b_id)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_responses" ADD COLUMN "coach_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_message" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_coach_a_id_users_id_fk" FOREIGN KEY ("coach_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_coach_b_id_users_id_fk" FOREIGN KEY ("coach_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_reads_conv_coach_idx" ON "conversation_reads" USING btree ("conversation_id","coach_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_pair_idx" ON "conversations" USING btree ("coach_a_id","coach_b_id");--> statement-breakpoint
CREATE INDEX "conversations_coach_a_idx" ON "conversations" USING btree ("coach_a_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_coach_b_idx" ON "conversations" USING btree ("coach_b_id","last_message_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "announcement_responses" ADD CONSTRAINT "announcement_responses_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Reprise de l'existant : chaque match déjà convenu ouvre sa conversation.
--
-- Sans cette reprise, la règle « une acceptation ouvre un fil » serait fausse
-- pour tout ce qui a été accepté avant aujourd'hui : les coachs qui ont un match
-- en cours trouveraient un écran vide. Un fil par PAIRE de coachs (et non par
-- match, comme partout ailleurs ici), rattaché au plus ancien match qui les a
-- réunis, daté de ce match — la liste s'ordonne donc comme leur histoire.
--
-- Le coach retenu pour une équipe est celui qui la représente : son principal,
-- à défaut le plus ancien affecté — la même règle qu'en application.
WITH rep AS (
  SELECT DISTINCT ON (tc.team_id) tc.team_id, tc.coach_id
  FROM "team_coaches" tc
  ORDER BY tc.team_id, tc.role, tc.created_at
), paires AS (
  SELECT
    LEAST(rh.coach_id, ra.coach_id) AS coach_a_id,
    GREATEST(rh.coach_id, ra.coach_id) AS coach_b_id,
    m.id AS match_id,
    m.created_at AS created_at
  FROM "matches" m
  JOIN rep rh ON rh.team_id = m.home_team_id
  JOIN rep ra ON ra.team_id = m.away_team_id
  -- Deux équipes encadrées par le même homme ne peuvent pas se parler à
  -- elles-mêmes : la contrainte de paire ordonnée le refuserait de toute façon.
  WHERE m.status <> 'cancelled' AND rh.coach_id <> ra.coach_id
)
INSERT INTO "conversations" ("coach_a_id", "coach_b_id", "match_id", "last_message_at", "created_at")
SELECT DISTINCT ON (coach_a_id, coach_b_id) coach_a_id, coach_b_id, match_id, created_at, created_at
FROM paires
ORDER BY coach_a_id, coach_b_id, created_at
ON CONFLICT DO NOTHING
