# 🚀 Guide de Déploiement - Améliorations Schéma SQL

**Date** : 25 Mai 2026  
**Version** : v1.0  
**Status** : 🟡 À RÉVISER AVANT DÉPLOIEMENT

---

## 📋 Résumé des Changements

### **4 Catégories d'Améliorations**

| Catégorie | Éléments | Impact |
|-----------|----------|--------|
| 🔴 **Sécurité (P1)** | Webhook Discord en config | Critique |
| 🟡 **Gouvernance (P2)** | Soft delete + RLS | Haute |
| 🟡 **Audit (P2)** | Trail de modifications | Haute |
| 🟢 **Performance (P3)** | Constraints + Views | Moyenne |

---

## 🔴 **P1 : Webhook Discord Sécurisé**

### Avant (❌ Risqué)
```sql
v_webhook_url text := 'https://discord.com/api/webhooks/TON_WEBHOOK_ICI/TON_TOKEN_ICI';
-- ⚠️ Exposé dans le code
```

### Après (✅ Sécurisé)
```sql
-- 1. Configuration centralisée
INSERT INTO app_config (key, value) VALUES ('discord_webhook_url', '...');

-- 2. Fonction récupère depuis DB
SELECT value INTO v_webhook_url FROM app_config WHERE key = 'discord_webhook_url';

-- 3. Gestion d'erreur + fallback
IF v_webhook_url IS NULL THEN RETURN NEW; END IF;
```

### Installation
```sql
-- Dans Supabase SQL Editor
UPDATE public.app_config 
SET value = 'https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN'
WHERE key = 'discord_webhook_url';
```

---

## 🟡 **P2 : Soft Delete (Data Governance)**

### Concept
Marquer les données comme supprimées au lieu de les effacer = conformité RGPD + audit trail

### Tables Affectées
- ✅ profiles
- ✅ clubs
- ✅ match_requests
- ✅ events

### Utilisation
```sql
-- Avant : DELETE (définitif)
DELETE FROM profiles WHERE id = '...';  -- ❌ Perte de données

-- Après : Soft Delete (réversible)
SELECT public.soft_delete_profile('...');  -- ✅ Marqué deleted_at = now()

-- Récupérer
SELECT * FROM profiles WHERE deleted_at IS NULL;  -- Voir seulement actifs
SELECT * FROM profiles WHERE deleted_at IS NOT NULL;  -- Voir supprimés
```

### Indexes Créés
```sql
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
-- Optimise les requêtes "WHERE deleted_at IS NULL"
```

---

## 🟡 **P2 : Row Level Security (RLS)**

### Concept
Chaque utilisateur ne voit que ses propres données selon ses permissions

### Policies Implémentées

#### **Profiles**
```sql
-- Tout utilisateur voit son propre profil
✅ Can SELECT: auth.uid() = id

-- Tout utilisateur peut se modifier
✅ Can UPDATE: auth.uid() = id

-- Tout le monde voit les profils coaches
✅ Can SELECT: role = 'coach' AND deleted_at IS NULL
```

#### **Clubs**
```sql
-- Tout le monde voit les clubs vérifiés
✅ Can SELECT: is_verified = true

-- Créateur peut modifier
✅ Can UPDATE: auth.uid() = created_by
```

#### **Match Requests**
```sql
-- Coach voit ses demandes + les demandes OPEN
✅ Can SELECT: coach_id = auth.uid() OR status = 'OPEN'
```

### Activation
```sql
-- RLS est ACTIVÉ par défaut
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Mais les policies sont vides → À TESTER
-- Environnement de développement recommandé avant prod
```

### ⚠️ Attention
```
RLS peut CASSER des requêtes existantes si mal configuré.
→ Tester dans dev d'abord
→ Valider avec l'équipe
→ Progressif (activer 1 table à la fois)
```

---

## 🟡 **P2 : Audit Trail**

### Table Créée
```sql
public.audit_log (
  id uuid PRIMARY KEY,
  table_name text,         -- "profiles", "clubs", etc
  record_id uuid,          -- ID du record modifié
  action text,             -- INSERT / UPDATE / DELETE
  old_values jsonb,        -- État avant
  new_values jsonb,        -- État après
  changed_by uuid,         -- Qui a changé
  changed_at timestamptz   -- Quand
)
```

### Exemple
```sql
-- Coach modifie son profil
UPDATE profiles SET coach_level = 'D2' WHERE id = '123abc...';

-- Automatiquement logé :
INSERT INTO audit_log (
  table_name = 'profiles',
  record_id = '123abc...',
  action = 'UPDATE',
  old_values = { coach_level: 'D1', ... },
  new_values = { coach_level: 'D2', ... },
  changed_by = '123abc...',
  changed_at = now()
);
```

### Consultation
```sql
-- Voir l'historique d'un coach
SELECT * FROM audit_log 
WHERE table_name = 'profiles' 
  AND record_id = 'coach_id'
ORDER BY changed_at DESC;

-- Voir qui a modifié quoi
SELECT 
  table_name, 
  action, 
  changed_by, 
  changed_at
FROM audit_log
ORDER BY changed_at DESC
LIMIT 100;
```

### Storage
```
⚠️ La table audit_log peut devenir très grande
→ Archiver les logs > 1 an
→ Index sur (changed_at) OBLIGATOIRE
→ Purger régulièrement
```

---

## 🟢 **P3 : Validations & Performance**

### Constraints Ajoutées

#### **Scores limités**
```sql
home_score >= 0 AND home_score <= 99
away_score >= 0 AND away_score <= 99
-- Évite les scores farfelus : 999 buts
```

#### **JSONB Validation**
```sql
quotas IS NULL OR jsonb_typeof(quotas) = 'object'
-- Valide la structure JSON avant INSERT
```

#### **ref_categories Array**
```sql
ref_categories IS NULL OR jsonb_typeof(ref_categories) = 'array'
-- Garantit un tableau, pas un objet
```

---

## 🟢 **P3 : Views Utiles**

Trois vues créées pour simplifier les requêtes :

### 1️⃣ `clubs_active`
```sql
SELECT * FROM public.clubs_active;
-- Affiche les clubs vérifiés et actifs
-- Équivalent : WHERE is_verified = true AND deleted_at IS NULL
```

### 2️⃣ `match_requests_open`
```sql
SELECT * FROM public.match_requests_open;
-- Affiche les demandes OPEN avec infos coach + club
-- Join automatique : easier requête
```

### 3️⃣ `events_upcoming`
```sql
SELECT * FROM public.events_upcoming;
-- Affiche les matchs à venir (date >= aujourd'hui)
-- Join automatique : easier requête
```

---

## 🧪 Plan de Déploiement

### **Phase 1 : Préparation (1h)**
- [ ] Backup complet de la BD
- [ ] Review du script SQL
- [ ] Préparer webhook Discord URL

### **Phase 2 : Déploiement en DEV (2h)**
- [ ] Exécuter script dans Supabase SQL Editor (DEV)
- [ ] Configurer webhook URL
- [ ] Activer RLS progressivement (1 table à la fois)
- [ ] Tester toutes les policies
- [ ] Valider audit_log

### **Phase 3 : Tests (4h)**
- [ ] Test soft delete
- [ ] Test audit trail (INSERT/UPDATE/DELETE)
- [ ] Test RLS (connexion comme utilisateur)
- [ ] Performance check (indexes)
- [ ] Tests unitaires frontend

### **Phase 4 : Déploiement PROD (30m)**
- [ ] Exécuter script dans Supabase SQL Editor (PROD)
- [ ] Vérifier webhook URL = PROD Discord
- [ ] Monitoring audit_log pour erreurs
- [ ] Vérifier aucune perte de données

### **Phase 5 : Post-Déploiement (continu)**
- [ ] Surveiller logs d'audit
- [ ] Archiver audit_log > 1 mois
- [ ] Tester RLS régulièrement
- [ ] Optimiser queries si besoin

---

## 🚨 Risques & Mitigation

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| **RLS casse les requêtes** | Critique | Tester d'abord en DEV |
| **Audit log explose** | Moyen | Archiver régulièrement |
| **Webhook fails silencieusement** | Faible | Surveiller audit_log |
| **Soft delete data bloat** | Faible | Purgé dans 1-2 ans |

---

## 📞 Support

### Problèmes Courants

**Q: RLS active = plus aucun SELECT ?**
```
A: Vérifier les policies. Par défaut, aucune policy = aucun accès.
   Désactiver RLS temporairement :
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

**Q: Audit_log qui grandit trop ?**
```
A: Créer une tâche d'archivage :
   DELETE FROM audit_log WHERE changed_at < now() - interval '1 year';
```

**Q: Comment rollback ?**
```
A: Depuis git :
   git revert / git reset
   Puis re-exécuter script original
```

---

## 📊 Checklist Finale

- [ ] Backup BD effectué
- [ ] Script SQL passé en code review
- [ ] Tests DEV validés
- [ ] Webhook Discord configuré
- [ ] RLS policies testées
- [ ] Audit trail fonctionne
- [ ] Performance acceptable
- [ ] Documentation mise à jour
- [ ] Équipe informée
- [ ] Monitoring configuré

**Validé par** : [À signer]  
**Date de déploiement** : [À planifier]

