# 🚀 CHECKLIST DE VALIDATION MOBILE - DÉPLOIEMENT ALPHA V1

Ce document regroupe les points critiques à tester sur smartphone une fois l'application déployée en production.

---

## 📱 1. INSTALLATION & PWA (LE "FEELING" APP)
* [ ] **Lien HTTPS** : Vérifier que l'adresse commence par `https://`.
* [ ] **Prompt d'installation** : Attendre 3 secondes sur la home. La bannière "Installer FOOTCOACH ALPHA" doit apparaître.
* [ ] **Mode Standalone** : Ouvrir l'app depuis l'écran d'accueil. La barre d'adresse du navigateur doit disparaître.

## 🔑 2. INSCRIPTION & ONBOARDING
* [ ] **Verrouillage Coach** : Créer un compte. Vérifier la mention "POSITION COACH FORCÉE" et l'absence de choix de rôle.
* [ ] **Sélection Club** : Rechercher un club (ex: "Sète"). Vérifier que la liste se charge et qu'on peut cliquer.
* [ ] **Initialisation Bionique** : Vérifier que l'animation finale (3 sec) est fluide sur mobile.

## 📡 3. LE RADAR (MATCHMAKING)
* [ ] **Émission de Signal** : Bouton "+" -> "Match Amical". Remplir et valider.
* [ ] **Visibilité** : Le signal doit être dans l'onglet "Mes Signaux" du Radar.
* [ ] **Mode Sonar** : Basculer en vue Radar. Votre point doit apparaître sur les ondes animées.

## 💬 4. CHAT & RÉSEAU
* [ ] **Ouverture Chat** : Ouvrir le chat depuis une annonce.
* [ ] **Ergonomie Mobile** : Vérifier que le clavier ne cache pas le champ de saisie.
* [ ] **Temps Réel** : Envoyer un message et vérifier l'apparition instantanée.

## 📢 5. LE BRIEFING (COMMS)
* [ ] **Terminologie** : L'onglet dans la nav barre doit s'appeler "Briefing".
* [ ] **Flash Info** : Créer une info et vérifier son affichage dans le flux.
* [ ] **Mon Réseau** : Vérifier la présence de l'onglet (vide par défaut).

## 🎨 6. DUAL-THEME (CLASSIC VS NEXUS)
* [ ] **Le Switch** : Profil -> Terminal de Contrôle (bas de page).
* [ ] **Mode Classic** : Fond gris clair (`bg-gray-50`), texte "Coach".
* [ ] **Mode Nexus** : Fond noir, effet scanlines, texte "Commandant".

## 🖼️ 7. UPLOADS (STORAGE SUPABASE)
* [ ] **Photo de Profil** : Icône appareil photo -> Prendre une photo réelle. Vérifier l'upload.
* [ ] **Blason Club** : Tester l'upload d'un logo de club.

## 🛠️ 8. RAPPORTS DE BUGS (TABLEAU ADMIN)
* [ ] **Signalement** : Paramètres -> Bugs & Améliorations. Envoyer un message.
* [ ] **Contrôle Admin** : Vérifier que Nordine voit la section verte "Contrôle_Alpha_Admin" avec les compteurs réels.

---
**Date de validation : 23 Mai 2026**  
**Version : Alpha 1.0**
