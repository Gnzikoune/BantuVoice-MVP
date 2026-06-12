# 📖 Registre de Recherche (Research Log)

Conformément à la section **9.3 du Cadre Architectural**, ce document trace toutes les décisions méthodologiques, les expérimentations infructueuses (negative results) et les incidents techniques du projet BantuVoice depuis son lancement.

> *"En science, une erreur documentée est scientifiquement utile. Une erreur dissimulée est une fraude."*

---

## Entrée 00 : Création du Cadre de Travail IA (`AI_WORKFLOW_RULES.md`)
- **Date :** Juin 2026
- **Problème / Risque :** Au lancement du projet, le PI (Gildas) a identifié un risque majeur : laisser l'IA coder de manière opaque (sans commentaires, avec des commits massifs), ce qui rendrait le code inauditable pour le CSGR-IA.
- **Résolution Scientifique :** Décision fondatrice de créer le fichier `AI_WORKFLOW_RULES.md`. Ce fichier impose à l'IA une traçabilité extrême (micro-commits), l'obligation de documenter via des Docstrings, et l'interdiction formelle de hardcoder des données sensibles.

## Entrée 01 : Stratégie de Collecte de Masse (Registre de Sources)
- **Date :** Juin 2026
- **Problème / Limite :** Le premier script d'extraction (`downloader.py`) obligeait l'utilisateur à entrer une URL YouTube manuellement dans le terminal. Cela rendait l'aspiration d'une chaîne complète (comme *Dumwénu TV*) laborieuse et non-scalable.
- **Résolution :** Modification de l'approche technique pour utiliser un fichier d'orchestration externe (`config/sources.json`). yt-dlp lit désormais ce registre pour automatiser les téléchargements massifs.

## Entrée 02 : Pivot de Versioning (Git Branching Strategy)
- **Date :** Juin 2026
- **Problème / Échec :** Lors des premières étapes (Collecte et Transcription), tout le code a été commité directement sur la branche principale (`main`), ce qui représente une mauvaise pratique de développement collaboratif.
- **Résolution :** Prise de conscience par l'équipe et changement de stratégie en cours de route. Création de la branche `feature/plateforme-annotation` pour isoler le développement complexe de l'Étape 03 avant son déploiement.

## Entrée 03 : Le Pivot "VAD" (Voice Activity Detection)
- **Date :** Juin 2026
- **Problème / Échec :** Lors des premiers tests de transcription sur une vidéo YouTube en langue Fang, le modèle Whisper a produit des hallucinations sévères. Bien que contraint par un prompt phonétique français (`--language "fr"`), l'IA a généré des mots français incohérents. Le WER brut (Word Error Rate) avoisinait les 100%.
- **Résolution Scientifique :** Changement de paradigme validé par le PI. Whisper a été rétrogradé d'outil de "traduction" à outil de "segmentation" temporelle (VAD). Il prépare la base phonétique, mais la traduction exacte est officiellement déléguée aux humains via l'interface web.

## Entrée 04 : Conception Ergonomique de l'Interface (UX/UI)
- **Date :** Juin 2026
- **Problème / Contrainte :** La première ébauche de la plateforme web (React) fonctionnait, mais son interface brute risquait de causer de la fatigue visuelle aux annotateurs lors de longues sessions.
- **Résolution :** Décision d'implémenter un design moderne ("Glassmorphism"), le support natif du mode Sombre/Clair, et l'ajout de raccourcis clavier (`Ctrl+Entrée` pour sauvegarder) pour maximiser la productivité scientifique.

## Entrée 05 : Simulation NoSQL via TinyDB
- **Date :** Juin 2026
- **Problème / Limite :** L'architecture (Section 5.2) exige MongoDB pour garantir la traçabilité des annotations. Or, la base n'était pas disponible en local pour le MVP, et le choix technologique final était en attente.
- **Résolution :** Intégration de `TinyDB`, une base de données orientée document (JSON) fonctionnant sans serveur local. Ce choix permet de respecter l'exigence de la "Double Annotation" tout en gardant un MVP facile à déployer.

## Entrée 06 : Faille de Sécurité sur la Double Annotation
- **Date :** Juin 2026
- **Problème / Incident :** Dans la première version du MVP web, l'identité du linguiste n'était pas sécurisée (sélection libre sans mot de passe). Cela violait la Règle du Moindre Privilège et mettait en péril la validité de la Double Annotation (usurpation d'identité).
- **Résolution :** Refonte de l'API pour intégrer une authentification forte par **Token JWT**. L'interface est désormais bloquée par un écran de connexion.

## Entrée 07 : Incompatibilité Passlib / Bcrypt (Bug Technique)
- **Date :** Juin 2026
- **Problème / Bug :** Lors du lancement du serveur sécurisé JWT, la librairie standard `passlib` a causé un crash fatal (`AttributeError: module 'bcrypt' a no attribute '__about__'`). La dernière version de `bcrypt` (v5.0) a cassé la compatibilité.
- **Résolution :** Suppression de `passlib` et réécriture des fonctions de hachage en utilisant les méthodes natives de `bcrypt` directement dans `server.py`.

## Entrée 08 : Fixation du Layout Desktop (CSS)
- **Date :** Juin 2026
- **Problème / Bug UI :** L'interface générait un scroll global de la page web, ce qui cachait le header et le bouton de déconnexion lorsque le linguiste défilait vers le bas.
- **Résolution :** Modification du CSS pour adopter une architecture "Desktop-like" (`height: 100vh`, `overflow: hidden`). Seuls les panneaux latéraux peuvent désormais défiler.
