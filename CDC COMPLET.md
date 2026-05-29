# 📘 CDCF COMPLET — FOOTCOACH
**Version : 1.0 — 29 Mai 2026**

---

## 0. VISION GLOBALE

Application PWA mobile-first dédiée aux **coachs de football amateur**.
Deux thèmes : **Classic** (pro, orange) et **Nexus** (gaming, cyan).
Alpha Test V1 bridé à 4 modules pour valider le cœur du produit.

---

## 1. ARCHITECTURE

### Stack technique
| Couche | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui + Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Edge Functions | Deno (3 fonctions déployées) |
| PWA | Service Worker + Push API + VAPID |
| Tests | Vitest + Testing Library |

### Edge Functions déployées
| Fonction | Rôle |
|---|---|
| `notify-coach` | Push notification ciblée (1 coach) |
| `notify-sos` | Push prioritaire tous coachs "toujours prêt" |
| `send-event-reminders` | Rappels 2h avant chaque événement (cron 15 min) |

### Cron Jobs actifs
| Job | Schedule | Rôle |
|---|---|---|
| `expire-match-requests` | 3h quotidien | Expire les annonces OPEN dont la date est passée |
| `event-reminders` | Toutes les 15 min | Rappels push avant les événements |

---

## 2. NAVIGATION ALPHA V1 (bridée)

```
BottomNav : 4 items uniquement
  🏠 Dashboard    /dashboard
  📡 Radar        /radar
  📅 Agenda       /events
  👤 Profil       /profile
  [+] Bouton central contextuel
```

---

## 3. MODULES — ÉTAT DÉTAILLÉ

---

### 3.1 AUTHENTIFICATION
| Fonctionnalité | Statut | Notes |
|---|---|---|
| Inscription email/password | ✅ Codé | |
| Connexion | ✅ Codé | |
| Auto-création profil (trigger SQL) | ✅ Codé | `handle_new_user()` |
| Parrainage via code `?ref=CODE` | ✅ Codé | Lien + `referred_by` en base |
| Banner parrain à l'inscription | ✅ Codé | Affiche le nom du parrain |
| Notification parrain à l'arrivée du filleul | ✅ Codé | Push via `notify-coach` |

---

### 3.2 PROFIL COACH ✅ (module V1 actif)
| Fonctionnalité | Statut | Notes |
|---|---|---|
| Onboarding guidé | ✅ Codé | Nom, club, catégorie, niveau, ville, stade |
| FIFA Card dynamique | ✅ Codé | Grade, stats, avatar |
| Edition profil (sections) | ✅ Codé | User, club, logistique, rayons |
| CV Coach (diplômes, expériences) | ✅ Codé | Table `cv_items` |
| Upload avatar / blason | ✅ Codé | Supabase Storage |
| Switch thème Classic/Nexus | ✅ Codé | Persisté en base |
| Statut coach (actif / toujours_pret / inactif) | ✅ Codé | |
| Dual-theme complet | ✅ Codé | Lexique adapté par thème |
| **QR Code parrainage (universel)** | ✅ Codé | Pointe vers `/public/coach/[code]` |
| **Section Parrainage** | ✅ Codé | Compteur filleuls + QR + partage |
| **Page publique `/public/coach/[code]`** | ✅ Codé | FIFA Card + infos + actions |
| Téléphone masqué si non connecté | ✅ Codé | Visible après échange de cartes |
| CV sur page publique | 🔒 Bridé V2 | Placeholder visible |
| Rôles joueur/parent/supporter | 🔒 Bridé V2 | Structure prête |

---

### 3.3 RADAR — ANNONCES ✅ (module V1 actif)
| Fonctionnalité | Statut | Notes |
|---|---|---|
| Formulaire annonce (Amical/Tournoi/Plateau) | ✅ Codé | |
| **Date flexible** | ✅ Codé | Weekend/Semaine/Vacances/Libre |
| Catégorie pré-remplie profil | ✅ Codé | |
| Localisation par défaut du club | ✅ Codé | |
| Détection lieu différent du club | ✅ Codé | Warning + recherche club alternatif |
| Blocage si profil club incomplet | ✅ Codé | Bannière + bouton compléter |
| Sonar animé mode Nexus | ✅ Codé | Blips cliquables |
| Liste cartes mode Classic | ✅ Codé | |
| Filtre catégorie + niveau + distance | ✅ Codé | Slider 5-200km |
| Distance réelle calculée (Haversine) | ✅ Codé | Depuis les clubs |
| Tri proximité + SOS en premier | ✅ Codé | |
| Grade + niveau sur les cartes | ✅ Codé | |
| Onglet Sonar / Mes Signaux / Palmarès | ✅ Codé | 3 onglets |
| Badge rouge réponse en attente | ✅ Codé | |
| Action "Intéressé" → POSTMATCHED | ✅ Codé | |
| Push notification Coach A | ✅ Codé | Client + trigger SQL |
| Lexique dual-theme | ✅ Codé | "Relever le défi" / "Proposer un match" |
| Bouton "Plus d'info" distinct Chat | ✅ Codé | |
| Boutons Chat / Refuser / Accepter | ✅ Codé | |
| Modal refus 3 motifs | ✅ Codé | Trop loin / Date / Niveau |
| Annonce PENDING → fiche de match | ✅ Codé | Statut intermédiaire |
| Fiche match double validation (chat) | ✅ Codé | `coach_a/b_confirmed` |
| Création événement après double validation | ✅ Codé | Dans les 2 agendas |
| Annonce → MATCHED après confirmation | ✅ Codé | |
| Message système "🎉 Match confirmé" | ✅ Codé | |
| Palmarès — historique matchs validés | ✅ Codé | |
| Swipe modifier / supprimer annonce | ✅ Codé | |
| Expiration automatique (cron 3h) | ✅ Codé | |
| **Badge 🚨 SOS sur les annonces** | ✅ Codé | Remonte en tête |
| **Désistement/Forfait + SOS** | ✅ Codé | Depuis l'événement + Modal |
| **Push prioritaire coachs "toujours_pret"** | ✅ Codé | Edge Function `notify-sos` |
| Stage / Événement comme types | ❌ Manquant V1 | |
| Mon Réseau depuis historique | ✅ Codé | Dans Comms |
| Tournoi avec quotas décrémentiels | 🔒 Bridé V2 | |
| Bonus XP si réponse SOS | 🔒 Bridé V2 | |

---

### 3.4 AGENDA ✅ (module V1 actif)
| Fonctionnalité | Statut | Notes |
|---|---|---|
| Calendrier mensuel avec navigation | ✅ Codé | |
| Créer entraînement/match/tournoi/plateau | ✅ Codé | |
| Swipe gauche supprimer / droit modifier | ✅ Codé | Soft delete |
| Clic → page détail | ✅ Codé | Données réelles |
| Filtre "Mes events / Tous" | ✅ Codé | |
| Correction décalage timezone | ✅ Codé | `+T00:00:00` |
| Disponibilités joueurs (P/A/I) | ✅ Codé | Upsert temps réel |
| Compteurs présence visible tous | ✅ Codé | |
| Liste nominale visible coach | ✅ Codé | |
| 🔔 Rappels push 2h avant | ✅ Codé | Edge Function + cron |
| Bouton activer notifications | ✅ Codé | `EventPushManager` |
| **QR Code validation jour J** | ✅ Codé | Token unique par match |
| **Page validation `/events/[id]/validate`** | ✅ Codé | Vibration + confirmation |
| **Après QR → propose échange cartes** | ✅ Codé | Lien vers page publique |
| **Bouton Forfait/SOS depuis l'événement** | ✅ Codé | `SosModal` + relance |
| Score match terminé | ✅ Codé | Affiché sur page détail |
| Convocation joueurs | 🔒 Bridé V2 | |
| Météo sur événement | 🔒 Bridé V2 | |
| Covoiturage | 🔒 Bridé V2 | |

---

### 3.5 DASHBOARD ✅ (module V1 actif)
| Fonctionnalité | Statut | Notes |
|---|---|---|
| Identité coach (club, catégorie, grade) | ✅ Codé | |
| Prochain événement (carte visuelle) | ✅ Codé | Match avec logos / Entraînement |
| **3 compteurs temps réel** | ✅ Codé | Signaux / Chats / Réponses |
| **4 KPIs saison réels** | ✅ Codé | Matchs joués / Via Radar / Annonces / Présence |
| Fil d'info (activité récente) | ✅ Codé | Matchs validés + events + annonces |
| Dual-theme complet | ✅ Codé | |
| ActionCenter | 🔒 Masqué Alpha | Convoquer/Message/Briefing |
| SquadOverview | 🔒 Masqué Alpha | Dépend de club_players |
| Live match temps réel | 🔒 Bridé V3 | Infrastructure Realtime prête |
| Feed type X (commentaires/rôles) | 🔒 Bridé V2 | |
| Stories style Instagram | 🔒 Bridé V2 | |
| Résultats équipes suivies | 🔒 Bridé V2 | |

---

### 3.6 RÉSEAU SOCIAL (bridé Alpha)
| Fonctionnalité | Statut | Notes |
|---|---|---|
| **Table `coach_connections`** | ✅ Codé | follow / connection |
| **Page publique coach** | ✅ Codé | FIFA Card + stats + actions |
| **Échange cartes FIFA (QR match)** | ✅ Codé | Post-validation QR |
| **Échange cartes (profil direct)** | ✅ Codé | Bouton sur page publique |
| **Suivre un coach (asymétrique)** | ✅ Codé | |
| **Mon Réseau fusionné** | ✅ Codé | MATCHED + connexions + statut |
| **Statut disponibilité dans réseau** | ✅ Codé | 🟢 Toujours prêt |
| Feed posts (publications) | 🔒 Bridé Alpha | Page existe, non visible |
| Commentaires sur posts | 🔒 Bridé V2 | |
| Réactions (like/fire) | 🔒 Bridé V2 | |
| Messagerie directe | 🔒 Bridé V2 | |
| Feed activité (style Instagram) | 🔒 Bridé V2 | |
| Stories (annonces actives) | 🔒 Bridé V2 | |
| CV dans la carte FIFA | 🔒 Bridé V2 | Placeholder visible |

---

### 3.7 CLUBS — INTÉGRITÉ DES DONNÉES ✅
| Fonctionnalité | Statut | Notes |
|---|---|---|
| Recherche floue (trigram pg_trgm) | ✅ Codé | |
| Normalisation (unaccent, sans ponctuation) | ✅ Codé | `name_normalized` GENERATED |
| UNIQUE INDEX sur nom normalisé | ✅ Codé | Anti race condition |
| Alias par ville (sigle ASB → AS Bobigny) | ✅ Codé | Auto-appris à chaque sélection |
| Vérification GPS 1km avant création | ✅ Codé | Nominatim geocoding |
| Structure parent/enfant (multi-équipes) | ✅ Codé | `parent_club_id` |
| Outil fusion doublons admin | ✅ Codé | `/admin/clubs` |
| Auto-vérification (ville + stade requis) | ✅ Codé | Trigger SQL |
| Alias unique par ville (ASB Bobigny ≠ ASB Béziers) | ✅ Codé | |
| Radar bloqué si club non vérifié | ✅ Codé | |

---

### 3.8 INFRASTRUCTURE & SÉCURITÉ ✅
| Fonctionnalité | Statut | Notes |
|---|---|---|
| Row Level Security (toutes tables) | ✅ Codé | |
| Soft delete (deleted_at) | ✅ Codé | Toutes tables principales |
| Audit trail (INSERT/UPDATE/DELETE) | ✅ Codé | Table `audit_log` |
| SCHEMA.sql V13.0 | ✅ À jour | |
| Push notifications PWA (VAPID) | ✅ Codé | Clés configurées |
| Version lock (force refresh) | ✅ Codé | `PWAUpdater` |
| Manifest PWA (standalone) | ✅ Codé | |
| Service Worker (push events) | ✅ Codé | |
| Caching ressources | 🔒 Désactivé Alpha | Force sync |

---

## 4. CE QUI RESTE À FAIRE V1

### Bloquant pour les bêta-testeurs
| # | Tâche | Effort |
|---|---|---|
| 1 | **Types Stage / Événement** dans le radar | 🟢 30 min |
| 2 | **Coordonnées GPS clubs existants** en base | 🟡 Manuel |
| 3 | **Tester RLS** en utilisateur réel | 🟡 Tests |
| 4 | **Icônes PWA** (actuellement URLs externes) | 🟢 1h |
| 5 | **Cron `event-reminders`** dans dashboard Supabase | 🟢 5 min |

### Nice to have V1
| # | Tâche | Effort |
|---|---|---|
| 6 | QR Code → **bonus XP parrain** affiché | 🟢 30 min |
| 7 | Bouton "Ajouter au réseau" depuis carte Radar | 🟢 1h |
| 8 | Lexique Classic partout (quelques pages Nexus fixes) | 🟢 1h |

---

## 5. ROADMAP V2

### V2a — Feed Social "Vestiaire Digital" (priorité)
- Feed type X avec commentaires par rôle (Coach/Parent/Joueur/Supporter)
- Réactions (like, fire, clap)
- Posts automatiques (résultats, validations, rappels)
- Résultats automatiques après saisie score

### V2b — Réseau Enrichi
- Messagerie directe entre connexions
- CV visible entre connexions
- Notif si une connexion dépose une annonce
- Feed activité (style Instagram)
- Stories = coachs avec annonces actives

### V2c — Logistique
- Covoiturage (demande/offre)
- Météo sur événement
- Tableau tactique
- Bibliothèque d'exercices
- Chat privé Coach-Parent

### V2d — Radar avancé
- Mode alerte désistement (infrastructure SOS déjà codée)
- Tournoi avec quotas décrémentiels
- Bonus XP FIFA pour réponse SOS
- QR Code — bonus XP parrain
- Mon Réseau depuis historique conversations

---

## 6. ROADMAP V3

| Fonctionnalité | Description |
|---|---|
| Live match temps réel | Canal Supabase Realtime par match, commentaires parents |
| Gamification complète | Points XP, badges, classements, parrainage |
| Profil Joueur autonome | Compte enfant distinct |
| Club Branding | App aux couleurs du club |
| Import PDF district | OCR des poules de championnat |
| Stats avancées | Tableau analytique complet |
| Équipes suivies | Résultats clubs externes |

---

## 7. BASE DE DONNÉES — TABLES

| Table | Rôle | V |
|---|---|---|
| `profiles` | Identité, rôle, stats, préférences | V1 |
| `clubs` | Clubs avec anti-doublon 7 couches | V1 |
| `club_aliases` | Sigles/abréviations par ville | V1 |
| `match_requests` | Annonces Radar + cycle de vie | V1 |
| `messages` | Chat temps réel (NegotiationChat) | V1 |
| `events` | Calendrier + QR token + validation | V1 |
| `event_attendees` | Disponibilités par événement | V1 |
| `push_subscriptions` | Abonnements push par profil | V1 |
| `coach_connections` | Réseau social (follow/connection) | V1 |
| `audit_log` | Traçabilité complète | V1 |
| `app_config` | Configuration (version, webhooks) | V1 |
| `cv_items` | CV Coach (diplômes, expériences) | V1 |
| `post_comments` | Commentaires sur posts | V2 |
| `post_reactions` | Réactions (like/fire) | V2 |
| `live_events` | Événements live match | V3 |
| `club_follows` | Équipes suivies | V3 |

---

## 8. SCORE GLOBAL

```
V1 Alpha (4 modules)    ████████████████████  95%
V2 (infrastructure)     ████████░░░░░░░░░░░░  40%
V3 (vision)             ██░░░░░░░░░░░░░░░░░░  10%
```

### V1 — Ce qui manque (5%)
1. Types Stage/Événement dans le radar
2. GPS clubs existants
3. Tests RLS utilisateur réel
4. Icônes PWA locales
5. Cron event-reminders (5 min de configuration)
