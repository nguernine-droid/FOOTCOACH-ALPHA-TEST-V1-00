// src/lib/config/features.ts

export const FEATURES = {
  // ==========================================
  // 🟢 V1 : VERSION LIGHT (BETA TESTEURS)
  // Ces fonctionnalités sont ACTIVES (true)
  // ==========================================
  V1_CORE_DASHBOARD: true,       // Fil d'actu, prochain événement
  V1_RADAR_MATCHMAKING: true,    // Trouver / Proposer un match amical
  V1_COMMS_BASIC: true,          // Annonces Info et Sondages basiques
  V1_TEAM_ROSTER: true,          // Ajouter joueur, Liste effectif
  V1_CALENDAR_EVENTS: true,      // Créer Entraînement/Match, Appel
  V1_MATCH_SCORE: true,          // Saisie du score et des buteurs après match

  // ==========================================
  // 🟡 V2 : VERSION INTERMÉDIAIRE (LOGISTIQUE)
  // Ces fonctionnalités sont DÉSACTIVÉES (false)
  // ==========================================
  V2_CARPOOLING: false,          // Système de demande/offre de covoiturage
  V2_WEATHER_WIDGET: false,      // API Météo sur la page événement
  V2_TACTIC_BOARD: false,        // Planche tactique (Dessin)
  V2_TRAINING_LIBRARY: false,    // Bibliothèque d'exercices
  V2_PLAYER_EVALUATION: false,   // École de foot, grilles de compétences
  V2_FAIR_PLAY_RATING: false,    // Notation adversaire après amical
  V2_CHAT_PRIVATE: false,        // Messagerie privée Coach-Parent

  // ==========================================
  // 🔴 V3 : VISION ULTIME (COMMUNAUTÉ)
  // Ces fonctionnalités sont DÉSACTIVÉES (false)
  // ==========================================
  V3_GAMIFICATION: false,        // Système de points, parrainage
  V3_IMPORT_DISTRICT_PDF: false, // OCR et importation des poules
  V3_PLAYER_PROFILE: false,      // L'enfant a son propre compte Joueur
  V3_CLUB_BRANDING: false,       // Application aux couleurs du club
  V3_ADVANCED_STATS: false,      // Tableau de bord analytique complet
};

export type FeatureKey = keyof typeof FEATURES;

/**
 * Vérifie si une fonctionnalité est activée
 */
export const isFeatureEnabled = (key: FeatureKey): boolean => {
  return FEATURES[key] ?? false;
};
