# CAHIER DES CHARGES : FOOTCOACH — ÉTAT DU PROJET
**Version : 2.1 — Mise à jour : 29 Mai 2026**

---

## 0. STRATÉGIE ALPHA TEST V1

### Périmètre bridé — 4 modules uniquement

L'Alpha Test V1 est volontairement limité à **4 modules** pour valider le cœur du produit avant d'ouvrir le reste.

| # | Module | Route | Statut |
|---|---|---|---|
| 1 | **Profil Coach** | `/profile` | ✅ Actif |
| 2 | **Calendrier** | `/events` | ✅ Actif |
| 3 | **Annonce (Radar)** | `/radar` | ✅ Actif |
| 4 | **Dashboard** | `/dashboard` | ✅ Actif (simplifié) |

**Modules cachés en Alpha :**
- Feed social → désactivé (`V1_FEED_SOCIAL: false`)
- Flash Info / Comms → désactivé (`V1_COMMS_BASIC: false`)
- Effectif joueurs → désactivé (`V1_TEAM_ROSTER: false`)
- Mon Réseau → désactivé (`V1_MON_RESEAU: false`)

> Le bridage est géré via `src/lib/config/features.ts` et la navigation `BottomNav`.
> Un seul `true/false` suffit à activer un module pour tous les testeurs.

---

## 1. VISION FONCTIONNELLE

Application PWA dédiée à la gestion d'équipes de football amateur.
Deux expériences selon le rôle et le thème choisi, centralisées autour du club.

---

## 2. MODULES FONCTIONNELS

### 2.1 Gestion des Profils
- [x] Profil **COACH** activé (Alpha V1)
- [x] FIFA Card dynamique avec stats et grade
- [x] Onboarding guidé (nom, club, catégorie, niveau, ville, stade)
- [x] CV Coach (diplômes, expériences, philosophie)
- [x] Switch de rôle (Coach / Parent / Joueur / Supporter / Admin)
- [x] Structure prête pour les rôles futurs
- [ ] Profil Joueur autonome (V3)
- [ ] Profil Parent autonome (V3)

---

### 2.2 Le Radar (Matchmaking)

#### Émission
- [x] Formulaire annonce : Amical / Tournoi / Plateau
- [x] Catégorie pré-remplie depuis le profil coach
- [x] Localisation par défaut du club (ville + stade)
- [x] Blocage publication si profil club incomplet (ville + stade manquants)
- [x] Détection lieu différent du club d'origine → proposition club alternatif

#### Réception
- [x] Sonar animé mode Nexus (blips lumineux)
- [x] Liste cartes mode Classic
- [x] Filtre catégorie + distance réelle (slider 5–200 km)
- [x] Tri par proximité (distance calculée depuis le club)
- [x] Séparation Sonar (adversaires) / Mes Signaux (mes annonces)
- [x] Badge rouge sur "Mes Signaux" si réponse en attente

#### Cycle de vie des annonces
- [x] OPEN → visible sur le Radar public
- [x] POSTMATCHED → Coach B a répondu, en attente Coach A
- [x] MATCHED → validé, disparaît du Radar, événement créé
- [x] EXPIRED → expiration automatique à 3h si date dépassée (cron)
- [x] Annonce Coach A disparaît du sonar public dès POSTMATCHED

#### Validation
- [x] Coach A : boutons Chat / ❌ Refuser / ✅ Accepter
- [x] Refus rapide avec 3 motifs (Trop loin / Date impossible / Niveau différent)
- [x] Coach B notifié du refus + motif dans le chat
- [x] Annonce repasse en OPEN après refus
- [x] Acceptation → événement créé dans les 2 agendas automatiquement
- [x] Fiche de match épinglée dans le chat (double validation coach A + B)
- [x] Message système "🎉 Match confirmé" quand les deux ont validé

#### Notifications
- [x] Push notification à Coach A quand Coach B répond
- [x] Badge rouge temps réel sur "Mes Signaux"
- [x] Trigger SQL de secours (filet de sécurité serveur)

#### Accès conditionnel
- [x] Coach avec club incomplet → peut voir le Radar (lecture seule)
- [x] Coach avec club incomplet → ne peut PAS déposer ni répondre à une annonce
- [x] Bannière d'avertissement + lien "Compléter mon profil"

---

### 2.3 Le Briefing (Communication)
- [x] Flash Info : annonces rapides (retards, changements de terrain)
- [x] Sondages basiques
- [ ] **Mon Réseau** : carnet des coachs rencontrés via le Radar ❌ à faire

---

### 2.4 Cockpit (Dashboard)
- [x] Prochaine mission (match / entraînement)
- [x] Vue d'ensemble effectif
- [x] Calendrier synchronisé avec les validations du Radar
- [ ] Indicateurs de performance réels ⚠️ (données statiques pour l'instant)

---

### 2.5 Agenda (Events)
- [x] Création entraînement / match / tournoi / plateau / convocation
- [x] Calendrier mensuel avec navigation
- [x] Correction décalage de date (timezone UTC → locale)
- [x] Swipe gauche → supprimer (soft delete) / swipe droit → modifier
- [x] Clic → page détail avec vraies données Supabase
- [x] Disponibilités joueurs (Présent / Absent / Incertain) avec upsert temps réel
- [x] Compteurs disponibilités visibles par tous
- [x] Liste nominale visible par le coach uniquement
- [x] Filtre "Mes events / Tous"
- [x] Bouton 🔔 activer rappels push (Service Worker + VAPID)
- [x] Rappels automatiques 2h avant chaque événement (Edge Function + cron 15 min)
- [x] Colonne `created_by` pour les policies RLS futures

---

### 2.6 Feed Social
- [x] Publication de posts
- [x] Fil d'actualité

---

## 3. SPÉCIFICATIONS TECHNIQUES

### 3.1 Stack
| Couche | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui + Radix |
| Animations | Framer Motion |
| Backend / BDD | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Edge Functions | Deno (notify-coach, send-event-reminders) |
| Tests | Vitest + Testing Library |
| PWA | Service Worker + manifest + Push API (VAPID) |

### 3.2 Design System — Dual-Theme
| Mode | Visuel | Lexique |
|---|---|---|
| **Classic** | Fond gris, accents orange, typo sobre | Coach, Effectif, Planning, Flash Info |
| **Nexus** | Fond noir, néon cyan/vert, scanlines | Commandant, Unités, Missions, Signal |

### 3.3 PWA
- [x] Manifest `standalone` pour installation écran d'accueil
- [x] Service Worker avec gestion push notifications
- [x] Mobile First — max-width 450px, format vertical
- [ ] Caching ressources critiques (désactivé volontairement en Alpha pour force sync)

---

## 4. MODÈLE DE DONNÉES (V13.0)

| Table | Rôle |
|---|---|
| `profiles` | Identité, rôle, stats RPG, préférences |
| `clubs` | Nom normalisé, ville, stade, coords GPS, parent/enfant, is_verified |
| `club_aliases` | Sigles et abréviations par ville (anti-doublon) |
| `match_requests` | Annonces radar + cycle de vie complet |
| `messages` | Chat temps réel lié aux annonces |
| `events` | Calendrier club + disponibilités |
| `event_attendees` | Réponses présence/absence/incertain |
| `feed_posts` | Publications sociales |
| `push_subscriptions` | Abonnements push par profil |
| `audit_log` | Traçabilité INSERT/UPDATE/DELETE |
| `app_config` | Configuration applicative (version, webhooks) |

---

## 5. SÉCURITÉ & DONNÉES

### 5.1 Anti-doublons clubs (6 couches)
| Couche | Mécanisme |
|---|---|
| 1 | Search-as-you-type + trigram (pg_trgm) |
| 2 | `name_normalized` GENERATED (unaccent + minuscules + sans ponctuation) |
| 3 | UNIQUE INDEX sur `name_normalized` |
| 4 | `club_aliases` auto-apprentissage par ville |
| 5 | Vérification GPS 1 km avant création |
| 6 | Structure parent/enfant (multi-équipes) |
| 7 | Outil fusion doublons admin (`/admin/clubs`) |

### 5.2 Row Level Security
- [x] RLS activée sur toutes les tables
- [x] `anon` = lecture seule
- [x] Policies coach, joueur, admin séparées

### 5.3 Soft Delete
- [x] Colonne `deleted_at` sur toutes les tables principales
- [x] Aucune donnée supprimée définitivement (sauf fusion clubs admin)

### 5.4 Audit
- [x] Trigger `audit_changes` sur profiles, clubs, match_requests, events
- [x] Table `audit_log` avec old/new values + user + timestamp

---

## 6. INFRASTRUCTURE

| Élément | État |
|---|---|
| Edge Function `notify-coach` | ✅ déployée |
| Edge Function `send-event-reminders` | ✅ déployée |
| Secrets VAPID (push) | ✅ configurés |
| Cron `expire-match-requests` | ✅ actif (3h quotidien) |
| Cron `event-reminders` | ✅ actif (toutes les 15 min) |
| Version Lock (PWAUpdater) | ✅ actif |

---

## 7. ROADMAP

### V1 — Restant à faire
- [ ] **Mon Réseau** — carnet coachs rencontrés via le Radar
- [ ] **Indicateurs de performance** dashboard (données réelles)
- [ ] **Lexique dual-theme** complet sur toutes les pages

### V2 — Dashboard "Super Hub" (priorité absolue)

Le Dashboard évolue en **centre névralgique social du club**, inspiré de X (Twitter) + Instagram + Sofascore.

#### Architecture en couches

```
V1 Alpha  → Hub de commande (prochain match + compteurs + fil simple)
V2a       → Feed type X (posts, commentaires, rôles, réactions)
V2b       → Résultats automatiques + équipes suivies
V3a       → Live match temps réel (Supabase Realtime)
V3b       → Stories style Instagram (annonces actives du Radar)
```

#### V2a — Feed "Vestiaire Digital" type X

Chaque club a un espace conversationnel par rôle :
- **Coach** → posts officiels, annonces, consignes tactiques
- **Parent** → questions, réactions, discussions
- **Joueur** → réactions, partages
- **Supporter** → posts publics uniquement

Types de posts automatiques :
- 🏆 Résultat → généré après saisie du score
- 📅 Rappel → J-24h avant un événement
- 🔴 Live → déclenché au coup d'envoi
- ✅ Validation → match confirmé via Radar

#### V3a — Live Match temps réel
- Canal Supabase Realtime dédié : `live:event_[id]`
- Coach saisit buts/cartons → auto-publié dans le fil
- Commentaires parents/joueurs en direct

#### Tables requises (à créer en V2)
```sql
post_comments  (post_id, author_id, content, created_at)
post_reactions (post_id, profile_id, type: like/fire/clap)
live_events    (event_id, minute, type, player_name)
club_follows   (follower_id, club_id)
```

### V2 — Réseau Social style Instagram

**Concept :** Fusionner Feed + Mon Réseau en une expérience sociale inspirée d'Instagram.

| Élément Instagram | Adaptation FootCoach |
|---|---|
| **Stories** | Coachs avec une annonce OPEN en ce moment — cercles cliquables en haut du feed |
| **Feed** | Publications + résultats automatiques après match + validations Radar |
| **Stats profil** | Matchs joués · Annonces publiées · Contacts réseau |
| **Discover** | Coachs proches avec annonces actives |

- [ ] **Réseau social style Instagram** (`V2_NETWORK_INSTAGRAM`)
- [ ] Covoiturage (demande/offre)
- [ ] Widget météo sur événement
- [ ] Tableau tactique (dessin)
- [ ] Bibliothèque d'exercices entraînement
- [ ] Évaluation joueurs / grilles de compétences
- [ ] Notation adversaire après amical (Fair Play)
- [ ] Chat privé Coach-Parent
- [ ] **Mode alerte désistement / SOS** (coach toujours prêt + bonus XP)
- [ ] **QR Code validation jour J**
- [ ] **Tournoi avec quotas décrémentiels**

### V3 — Vision ultime
- [ ] Gamification (points, parrainage, bonus XP FIFA)
- [ ] Import PDF district (OCR poules)
- [ ] Profil Joueur autonome
- [ ] Club Branding (couleurs personnalisées)
- [ ] Stats avancées (tableau analytique complet)
- [ ] Mon Réseau évolué (communauté coachs)
