// src/lib/config/features.ts
// ==========================================
// FOOTCOACH — FEATURE FLAGS
// Alpha Test V1 : 4 modules actifs uniquement
// ==========================================

export const FEATURES = {

  // ==========================================
  // 🟢 ALPHA V1 — MODULES ACTIFS (4 piliers)
  // ==========================================
  V1_PROFILE:           true,   // Profil coach (création, FIFA Card, stats)
  V1_CALENDAR_EVENTS:   true,   // Calendrier (créer, voir, disponibilités)
  V1_RADAR_MATCHMAKING: true,   // Annonce (déposer, répondre, valider)
  V1_MATCH_SCORE:       true,   // Saisie score après match

  // ==========================================
  // 🔴 ALPHA V1 — MODULES BRIDÉS (cachés)
  // Déverrouillés progressivement après retours bêta
  // ==========================================
  V1_FEED_SOCIAL:       true,   // Fil d'actualité / réseau social
  V1_COMMS_BASIC:       false,  // Flash Info / Annonces club
  V1_TEAM_ROSTER:       false,  // Effectif joueurs
  V1_MON_RESEAU:        false,  // Carnet contacts coachs (style Instagram — V2)

  // ==========================================
  // 🟡 V2 — LOGISTIQUE (désactivé)
  // ==========================================
  V2_NETWORK_INSTAGRAM: false,  // Réseau social style Instagram (stories + feed)
  V2_CARPOOLING:        false,  // Covoiturage
  V2_WEATHER_WIDGET:    false,  // Météo sur événement
  V2_TACTIC_BOARD:      false,  // Tableau tactique
  V2_TRAINING_LIBRARY:  false,  // Bibliothèque d'exercices
  V2_PLAYER_EVALUATION: false,  // Grilles de compétences joueurs
  V2_FAIR_PLAY_RATING:  false,  // Notation adversaire
  V2_CHAT_PRIVATE:      false,  // Chat privé Coach-Parent
  V2_SOS_FORFAIT:       false,  // Alerte désistement / mode SOS
  V2_QR_CODE_MATCH:     false,  // QR Code validation jour J
  V2_TOURNAMENT_QUOTAS: false,  // Tournoi avec places décrémentielles

  // ==========================================
  // 🔴 V3 — VISION ULTIME (désactivé)
  // ==========================================
  V3_GAMIFICATION:        false, // Points, parrainage, XP FIFA
  V3_IMPORT_DISTRICT_PDF: false, // OCR poules district
  V3_PLAYER_PROFILE:      false, // Compte joueur autonome
  V3_CLUB_BRANDING:       false, // App aux couleurs du club
  V3_ADVANCED_STATS:      false, // Tableau analytique complet

};

export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (key: FeatureKey): boolean => FEATURES[key] ?? false;
