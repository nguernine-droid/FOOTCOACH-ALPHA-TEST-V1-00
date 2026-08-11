ALTER TABLE "users" ALTER COLUMN "first_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET DEFAULT '';--> statement-breakpoint
-- Le surnom arrive sur une table déjà peuplée : ajout nullable, backfill depuis
-- le prénom (l'identité affichée jusqu'ici), puis verrou NOT NULL.
ALTER TABLE "users" ADD COLUMN "nickname" text;--> statement-breakpoint
UPDATE "users" SET "nickname" = "first_name" WHERE "nickname" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "nickname" SET NOT NULL;