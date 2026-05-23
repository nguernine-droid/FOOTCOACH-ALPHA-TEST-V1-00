# CAHIER DES CHARGES : FOOTCOACH ALPHA TEST V1

Ce document définit les spécifications fonctionnelles et techniques de l'application **FOOTCOACH**, une PWA dédiée à la gestion d'équipes de football amateur.

---

## 1. VISION FONCTIONNELLE

L'application propose deux expériences distinctes basées sur le rôle et la préférence de l'utilisateur, tout en centralisant la gestion opérationnelle du club.

### 1.1 Gestion des Profils (Alpha V1)
*   **Accès Unique** : Pour cette version, seul le profil **COACH** est activé.
*   **Identité Visuelle (FIFA Card)** : Chaque membre dispose d'une carte dynamique affichant son score global et ses statistiques clés.
*   **Évolutivité** : Structure prête pour les rôles *Joueur*, *Parent* et *Supporter*.

### 1.2 Le Radar (Matchmaking)
*   **Émission de Signal** : Le coach publie une annonce (Amical, Tournoi, Plateau).
*   **Sonar Tactique** : Visualisation des clubs aux alentours émettant des signaux.
*   **Négociation** : Messagerie instantanée intégrée pour fixer les détails du match.
*   **Validation** : Mise en relation (Match) automatique dès acceptation mutuelle.

### 1.3 Le Briefing (Communication)
*   **Flash Info** : Diffusion d'alertes rapides (retards, changements de terrain).
*   **Mon Réseau** : Carnet d'adresses automatique regroupant tous les coachs rencontrés via le Radar pour maintenir le contact.

### 1.4 Cockpit (Dashboard)
*   **Vue d'ensemble** : Statut de l'effectif, prochaine mission (match/entraînement) et indicateurs de performance.
*   **Planning** : Calendrier synchronisé avec les validations du Radar.

---

## 2. SPÉCIFICATIONS TECHNIQUES

### 2.1 Stack Technologique
*   **Frontend** : Next.js 15.1 (App Router), React 19.
*   **Backend & Database** : Supabase (PostgreSQL).
*   **Realtime** : Supabase Broadcast/Presence pour le chat instantané.
*   **Authentification** : Supabase Auth (Email/Password).
*   **Stockage** : Supabase Storage (Buckets pour blasons de clubs et avatars).

### 2.2 Design System & Dual-Theme
L'application bascule dynamiquement entre deux univers :

1.  **MODE CLASSIC (Cible Pro)** :
    *   **Visuel** : Fond `bg-gray-50`, accents Orange Tangerine, typographie sobre.
    *   **Lexique** : "Coach", "Effectif", "Planning", "Flash Info".
2.  **MODE NEXUS (Cible Gaming)** :
    *   **Visuel** : Fond `bg-black`, accents Néon Cyan/Vert, effets Scanlines/Glitch.
    *   **Lexique** : "Commandant", "Unités", "Missions", "Signal".

### 2.3 Architecture PWA
*   **Manifest** : Configuration `standalone` pour installation sur écran d'accueil.
*   **Service Worker** : Caching des ressources critiques pour un chargement rapide.
*   **Mobile First** : Optimisé exclusivement pour un usage smartphone (Format vertical).

---

## 3. MODÈLE DE DONNÉES (SCHEMA SQL)

*   **profiles** : Identité, rôle, stats RPG, préférences de thème.
*   **clubs** : Nom, catégorie, logo, localisation.
*   **match_requests** : Annonces du radar (type, date, statut OPEN/PENDING/MATCHED).
*   **messages** : Historique des discussions liées aux demandes de matchs.
*   **events** : Calendrier club (entraînements et matchs validés).

---

## 4. ÉTAT DU DÉVELOPPEMENT (ALPHA)

*   [x] Inscription / Onboarding Coach unique.
*   [x] Radar avec détection de signaux et chat en temps réel.
*   [x] Système de switch de thème Classic / Nexus.
*   [x] Gestion des uploads (Blasons/Avatars) vers Supabase.
*   [x] Build de production validé et sécurisé.

---
**Version du document : 1.0**  
**Date : 23 Mai 2026**
