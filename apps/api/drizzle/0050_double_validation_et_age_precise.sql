ALTER TABLE "announcement_responses" ADD COLUMN "owner_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "announcement_responses" ADD COLUMN "responder_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "match_announcements" ADD COLUMN "precise_category" text;

-- Reprise de l'existant : les propositions déjà acceptées l'ont été à une
-- époque où une seule signature était demandée, celle de l'émetteur. Elles
-- portent bien un accord des deux côtés — le match a été créé — et doivent
-- donc ressortir validées des deux, sans quoi les fils ouverts rouvriraient
-- un bouton « Valider » sur des matchs déjà joués.
UPDATE "announcement_responses"
   SET "owner_confirmed_at" = "created_at", "responder_confirmed_at" = "created_at"
 WHERE "status" = 'accepted';
