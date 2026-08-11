-- Genre de l'équipe, à côté de sa catégorie. Nullable et sans backfill : le
-- genre d'une équipe créée avant ne se devine pas, et NULL se lit « non
-- renseigné » là où le formulaire d'annonce le constate déjà pour la catégorie.
ALTER TABLE "teams" ADD COLUMN "gender" text;
