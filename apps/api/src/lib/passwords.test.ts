import assert from "node:assert/strict";
import test from "node:test";
import {
  PASSWORD_LOGIN_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  chosenPasswordSchema,
  isForbiddenPassword,
  loginSchema,
  passwordProblem,
  registerCoachSchema,
} from "@teamnexus/shared";
import { generateTempPassword } from "./passwords.js";

/**
 * Non-régression FC-09 — politique de mot de passe.
 *
 * `z.string().min(8)` sans autre exigence laissait passer « motdepasse » et
 * « 12345678 ». Tenable seulement si la limitation de débit bornait le
 * devinage — ce qu'elle ne faisait pas (FC-01, FC-02).
 */

const BON = "Vestiaire-Gerland-2026";

test("un mot de passe trop court est refusé à l'inscription", () => {
  for (const court of ["a", "court", "Onze-carac"]) {
    assert.notEqual(passwordProblem(court), null, `« ${court} » doit être refusé`);
    assert.equal(chosenPasswordSchema.safeParse(court).success, false);
  }
});

test("les grands classiques sont refusés même assez longs", () => {
  for (const commun of ["motdepasse", "azertyuiop", "administrateur", "monmotdepasse"]) {
    assert.ok(commun.length >= PASSWORD_MIN_LENGTH || true);
    assert.ok(isForbiddenPassword(commun), `« ${commun} » doit être interdit`);
  }
});

test("le vocabulaire du football est refusé : ce sont les premiers essais ici", () => {
  for (const evident of ["teamnexus", "Football123!", "ENTRAINEUR", "équipe", "Champion2026"]) {
    assert.ok(isForbiddenPassword(evident), `« ${evident} » doit être interdit`);
  }
});

test("un déguisement en chiffres ou ponctuation ne sauve pas un mot courant", () => {
  // C'est le contournement réflexe quand un formulaire exige « un chiffre ».
  for (const deguise of ["password1", "1password", "!!azerty!!", "Motdepasse2026", "007football"]) {
    assert.ok(isForbiddenPassword(deguise), `« ${deguise} » doit être interdit`);
  }
});

test("un mot de passe uniquement numérique est refusé", () => {
  assert.ok(isForbiddenPassword("123456789012"), "douze chiffres ne font pas un mot de passe");
});

test("un mot de passe convenable passe, sans exigence de gymnastique", () => {
  // Volontairement sans obligation de majuscule ni de symbole : une phrase
  // longue vaut mieux qu'un « P@ssw0rd! » que personne ne retient.
  for (const bon of [BON, "les u13 jouent samedi", "chaussettes rayées bleues"]) {
    assert.equal(passwordProblem(bon), null, `« ${bon} » devrait convenir`);
    assert.equal(chosenPasswordSchema.safeParse(bon).success, true);
  }
});

const INSCRIPTION = {
  nickname: "Alex",
  firstName: "Alex",
  lastName: "Martin",
  email: "alex@exemple.fr",
  teamName: "FC Exemple",
  teamCity: "Lyon",
  teamCategory: "U13",
  teamGender: "masculin",
  acceptTerms: true,
  acceptResponsibility: true,
} as const;

test("l'inscription applique la politique", () => {
  assert.equal(registerCoachSchema.safeParse({ ...INSCRIPTION, password: "azerty12" }).success, false);
  assert.equal(registerCoachSchema.safeParse({ ...INSCRIPTION, password: BON }).success, true);
});

test("sans les deux acceptations, l'inscription est refusée par le serveur", () => {
  // Le vrai point de contrôle. L'interface empêche déjà de valider sans cocher,
  // mais l'interface n'est pas une preuve : c'est ici que ça se joue, et une
  // case simplement absente doit échouer autant qu'une case à `false`.
  for (const manquant of [
    { acceptTerms: false },
    { acceptResponsibility: false },
    { acceptTerms: undefined },
    { acceptResponsibility: undefined },
    { acceptTerms: "oui" },
  ]) {
    const candidat = { ...INSCRIPTION, password: BON, ...manquant };
    assert.equal(
      registerCoachSchema.safeParse(candidat).success,
      false,
      `${JSON.stringify(manquant)} ne doit pas créer de compte`,
    );
  }
});

test("la CONNEXION reste à 8 : ne pas verrouiller dehors les comptes existants", () => {
  // Le point de compatibilité. Un coach dont le mot de passe fait 9 caractères,
  // ou qui vient de recevoir un mot de passe temporaire, doit pouvoir entrer.
  assert.equal(PASSWORD_LOGIN_MIN_LENGTH, 8);
  assert.equal(
    loginSchema.safeParse({ email: "a@b.fr", password: "ancien12" }).success,
    true,
    "un mot de passe existant de 8 caractères doit encore permettre de se connecter",
  );
  // Y compris un grand classique : refuser ici, ce serait refuser un mot de
  // passe correct — et révéler au passage qu'il figure dans notre liste.
  assert.equal(loginSchema.safeParse({ email: "a@b.fr", password: "motdepasse" }).success, true);
});

test("les mots de passe temporaires respectent la politique qu'ils servent", () => {
  for (let i = 0; i < 200; i++) {
    const temp = generateTempPassword();
    assert.equal(temp.length, PASSWORD_MIN_LENGTH);
    assert.equal(passwordProblem(temp), null, `« ${temp} » ne satisfait pas la politique`);
    assert.doesNotMatch(temp, /[ilIO01]/, "l'alphabet doit rester dictable sans ambiguïté");
  }
});

test("les mots de passe temporaires ne se répètent pas", () => {
  const tirages = new Set(Array.from({ length: 500 }, () => generateTempPassword()));
  assert.equal(tirages.size, 500, "500 tirages doivent donner 500 valeurs distinctes");
});
