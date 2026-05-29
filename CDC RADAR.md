# 📘 CDCF MODULE : RADAR NEXUS
## La Recherche et Validation de Match
**Version : 2.0 — 28 Mai 2026**

---

## 1. IDENTITÉ DU MODULE

| Propriété | Valeur |
|---|---|
| Route | `/radar` — `/radar/new` |
| Thème Classic | Fond gris, accents orange, cartes blanches |
| Thème Nexus | Fond noir, accents cyan, animation sonar |
| Couleur d'accent | Cyan (scan/recherche) + Orange (action) |
| Accès | Coach avec profil club **complet** (ville + stade) |

---

## 2. PRÉREQUIS D'ACCÈS

```
Coach connecté
      ↓
Club renseigné (nom + ville + stade) → is_verified = true
      ↓
✅ Peut déposer et répondre aux annonces

Club incomplet → is_verified = false
      ↓
✅ Peut voir le Radar (lecture seule)
❌ Bouton "+" grisé
❌ Bouton "Proposer Match" remplacé par avertissement
❌ Bouton "Publier" grisé dans /radar/new
↳ Bannière → lien "Compléter mon profil"
```

---

## 3. CYCLE DE VIE D'UNE ANNONCE

```
OPEN        → Annonce visible sur le Radar public
POSTMATCHED → Coach B a répondu. Masquée du sonar public.
              Coach A notifié (push + badge rouge).
MATCHED     → Les deux coachs ont validé. Disparaît du Radar.
              Événement créé dans les deux agendas.
EXPIRED     → Date dépassée sans réponse (cron 3h quotidien).
CANCELLED   → Supprimée par le coach (soft delete).
```

---

## 4. VUE COACH A — ÉMISSION

### 4.1 Formulaire `/radar/new`

**Champs :**
| Champ | Obligatoire | Détail |
|---|---|---|
| Type | ✅ | Match Amical / Tournoi / Plateau |
| Catégorie | ✅ | Pré-remplie depuis le profil coach |
| Date | ✅ | — |
| Heure | ✅ | — |
| Ville | ✅ | Pré-remplie depuis le club (bloquant à la publication) |
| Stade | ✅ | Pré-rempli depuis le club (bloquant à la publication) |
| Commentaire | ❌ | Texte libre |

**Sécurités lieu :**
- Si ville saisie ≠ ville du club → avertissement orange + recherche club alternatif
- Club alternatif sélectionné → `venue_club_id` stocké pour le calcul de distance

**Validation à la soumission :**
- Ville vide → alerte bloquante
- Stade vide → alerte bloquante
- Club non vérifié → bouton "Publier" grisé

**Résultat :** annonce créée avec `status = OPEN`, `coach_id` du coach A.

---

## 5. VUE COACH B — RÉCEPTION (SONAR)

### 5.1 Mode Nexus
- Animation "Scan Radar" avec blips lumineux
- Chaque blip = une annonce OPEN d'un autre coach
- Clic sur blip → fiche détail

### 5.2 Mode Classic
- Liste de cartes "Offres de Match"
- Triées par : **même ville > club vérifié > similarité**

### 5.3 Carte Annonce
Affiche :
- Blason + nom du club adverse
- Nom du coach (Grade, niveau)
- Type d'annonce (Amical / Tournoi / Plateau)
- Catégorie + date + heure
- Lieu + distance réelle depuis le club du Coach B (en km)
- Commentaire si renseigné

### 5.4 Filtres
| Filtre | Comportement |
|---|---|
| Catégorie | TOUS / U6-U7 / … / SÉNIORS / VÉTÉRANS |
| Distance max | Slider 5–200 km (défaut 50 km) |

**Tri automatique :** du plus proche au plus loin.
Les clubs sans coordonnées GPS apparaissent en dernier.

### 5.5 Action "Intéressé"
- Coach B clique **PROPOSER MATCH**
- Annonce passe en `POSTMATCHED`
- Annonce disparaît du sonar public
- Chat s'ouvre automatiquement
- Push notification envoyée à Coach A
- Badge rouge apparaît sur "Mes Signaux" de Coach A

---

## 6. VUE COACH A — VALIDATION

### 6.1 Onglet "Mes Signaux"
- Badge rouge si réponse en attente
- Annonce affiche : **⚡ Réponse reçue !** + 3 boutons

| Bouton | Icône | Action |
|---|---|---|
| Chat | 💬 | Ouvre la négociation |
| Refuser | ❌ | Ouvre le modal de refus |
| Accepter | ✅ | Lance la validation |

---

### 6.2 Scénario A — Accepter ✅

```
Coach A clique Accepter
      ↓
1. Récupère infos complètes (clubs des 2 coachs)
2. Crée l'événement dans les 2 agendas :
   - title : "Club A vs Club B"
   - type  : match
   - date / heure / lieu de l'annonce
   - home_club_id / away_club_id
3. Annonce → status = MATCHED
4. Chat s'ouvre avec fiche de match épinglée
5. Vibration haptic [50, 30, 50, 30, 100]
```

**Fiche de match dans le chat :**
```
┌─────────────────────────────────────────┐
│ 📋 FICHE DE MATCH — À VALIDER           │
│  Club A  vs  Club B                     │
│  U13 • Match Amical                     │
│  📅 14 juin 2026  ⏰ 14h00  📍 Stade X  │
│                                         │
│  ⬜ Coach A (moi) : En attente...       │
│  ⬜ Coach B       : En attente...       │
│                                         │
│  [ ✅ Je valide ce match ]              │
└─────────────────────────────────────────┘
```

- Chaque coach tape "Je valide" → son statut passe à ✅
- Quand les **deux** ont validé → message système :
  `🎉 Match confirmé par les deux coachs ! L'événement est dans vos agendas.`
- Fiche devient verte

---

### 6.3 Scénario B — Refuser ❌

```
Coach A clique Refuser
      ↓
Sheet remonte depuis le bas avec 3 motifs :
  📍 Trop loin
  📅 Date impossible
  ⚖️ Niveau différent

Coach A sélectionne un motif → Confirmer
      ↓
1. Annonce → status = OPEN (réapparaît sur le Radar)
2. respondent_id effacé
3. Message système dans le chat :
   "❌ Coach X a décliné — Motif : Trop loin"
4. Coach B peut voir le message dans le chat
```

---

### 6.4 Scénario C — Négociation 💬

```
Coach A ou B ouvre le chat
      ↓
Discussion libre
      ↓
Si accord → Coach A clique Accepter (Scénario A)
Si désaccord → Coach A clique Refuser (Scénario B)
```

- Chat temps réel (Supabase Realtime)
- Messages systèmes (validation, refus, confirmation) distingués visuellement
- Historique conservé après MATCHED → dans "Mon Réseau" (V2)

---

## 7. GESTION DES ANNONCES (MES SIGNAUX)

### 7.1 Actions sur ses propres annonces
| Geste | Action |
|---|---|
| Swipe gauche | Supprimer (soft delete + confirmation) |
| Swipe droite | Modifier l'annonce |

### 7.2 Statuts affichés
| Statut | Affichage |
|---|---|
| OPEN | 📡 Signal_En_Émission (animé) |
| POSTMATCHED | ⚡ Réponse reçue ! + boutons Chat/Refus/Accepter |
| MATCHED | ✅ MATCH_VALIDÉ + bouton Chat |
| EXPIRED | Grisé — affiché dans historique |

---

## 8. NOTIFICATIONS

| Événement | Destinataire | Canal |
|---|---|---|
| Coach B répond | Coach A | Push + Badge rouge |
| Coach A accepte | Coach B | Message chat |
| Coach A refuse | Coach B | Message chat + motif |
| Les deux valident | Les deux | Message chat système |

**Architecture push :**
- Client : `supabase.functions.invoke('notify-coach')` immédiat
- Serveur : trigger SQL → Edge Function (filet de sécurité)

---

## 9. GESTION DES CLUBS (INTÉGRITÉ DES DONNÉES)

### 9.1 Anti-doublon (7 couches)
| Couche | Mécanisme |
|---|---|
| 1 | Search-as-you-type + trigram |
| 2 | `name_normalized` (sans accents/ponctuation/casse) |
| 3 | UNIQUE INDEX sur `name_normalized` |
| 4 | `club_aliases` auto-appris par ville |
| 5 | Vérification GPS 1 km avant création |
| 6 | Structure parent/enfant (ex: AS Bobigny U13 → AS Bobigny) |
| 7 | Outil fusion admin `/admin/clubs` |

### 9.2 Alias contextuels
- `ASB` à Bobigny → AS Bobigny ✅
- `ASB` à Béziers → AS Béziers ✅
- Les deux coexistent (alias unique par ville, pas globalement)

### 9.3 Club vérifié
Un club est `is_verified = true` automatiquement si :
- `city` renseignée **ET**
- `stadium` renseigné

Un club non vérifié est invisible sur le Radar et bloque la publication d'annonces.

### 9.4 Distance
- Calculée par formule Haversine entre les clubs des deux coachs
- Référence = coordonnées GPS du club (géocodées via Nominatim à la création)
- Si coords manquantes → affichage `PROCHE` (dégradé propre)

---

## 10. DÉSISTEMENT / FORFAIT (V2)

> 🔴 Non implémenté — prévu en V2

**Scénario :**
1. Coach annule un match MATCHED
2. Annonce repasse en `OPEN` avec badge 🚨 URGENT
3. Push prioritaire aux coachs avec statut `toujours_pret`
4. Premier répondant → bonus XP FIFA Card
5. Tournoi : décrémentation automatique des quotas de places

---

## 11. MODÈLE DE DONNÉES

### Table `match_requests`
| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | PK |
| `coach_id` | uuid | Coach A (propriétaire) |
| `type` | text | Match Amical / Tournoi / Plateau |
| `category` | text | U13, Séniors… |
| `date` | date | Date souhaitée |
| `time` | time | Heure souhaitée |
| `city` | text | Ville du match |
| `stadium` | text | Stade du match |
| `location` | text | Concaténé ville + stade |
| `comment` | text | Texte libre |
| `status` | text | OPEN / POSTMATCHED / MATCHED / EXPIRED / CANCELLED |
| `respondent_id` | uuid | Coach B (répondant) |
| `venue_club_id` | uuid | Club du lieu si différent du club A |
| `coach_a_confirmed` | boolean | Validation fiche Coach A |
| `coach_b_confirmed` | boolean | Validation fiche Coach B |
| `quotas` | jsonb | Pour tournois (nb places…) |
| `deleted_at` | timestamptz | Soft delete |

### Table `messages`
| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | PK |
| `match_request_id` | uuid | Annonce liée |
| `sender_id` | uuid | Expéditeur |
| `text` | text | Contenu |
| `created_at` | timestamptz | — |

---

## 12. ÉTAT D'IMPLÉMENTATION

| Fonctionnalité | Statut |
|---|---|
| Formulaire création annonce | ✅ |
| Sonar animé Nexus | ✅ |
| Liste cartes Classic | ✅ |
| Filtre catégorie + distance | ✅ |
| Tri par proximité | ✅ |
| Séparation Sonar / Mes Signaux | ✅ |
| Badge rouge réponse en attente | ✅ |
| Action "Intéressé" → POSTMATCHED | ✅ |
| Push notification Coach A | ✅ |
| Boutons Chat / Refuser / Accepter | ✅ |
| Modal refus 3 motifs | ✅ |
| Acceptation → événement créé | ✅ |
| Fiche match double validation | ✅ |
| Message système chat | ✅ |
| Expiration automatique (cron) | ✅ |
| Swipe modifier / supprimer | ✅ |
| Blocage si profil incomplet | ✅ |
| Anti-doublon clubs (7 couches) | ✅ |
| Désistement / Forfait SOS | ❌ V2 |
| QR Code validation jour J | ❌ V2 |
| Tournoi quotas décrémentiels | ❌ V2 |
| Mon Réseau (historique contacts) | ❌ V2 |
| Bonus XP si réponse SOS | ❌ V2 |
