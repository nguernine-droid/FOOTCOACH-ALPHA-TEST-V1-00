/**
 * Environnement des tests.
 *
 * `src/env.ts` valide la configuration au chargement et coupe le processus si
 * elle ne tient pas : les tests doivent donc renseigner le nécessaire AVANT que
 * ce module ne soit évalué. D'où l'import de ce fichier en toute première ligne
 * de chaque test — les modules ES sont évalués dans l'ordre des imports.
 *
 * Aucune de ces valeurs ne joint quoi que ce soit : `postgres.js` n'ouvre sa
 * connexion qu'à la première requête, et les tests qui suivent ne touchent pas
 * à la base.
 */
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:5432/test";
process.env.JWT_ACCESS_SECRET ??= "secret-de-test-acces-32-caracteres-minimum";
process.env.JWT_REFRESH_SECRET ??= "secret-de-test-refresh-32-caracteres-minimum";
process.env.NODE_ENV ??= "test";
// Les plafonds doivent être ceux de la vraie vie : c'est ce qu'on mesure.
process.env.RATE_LIMIT_DISABLED = "";

export const TEST_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
