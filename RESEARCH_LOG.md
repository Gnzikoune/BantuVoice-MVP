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

## Entrée 09 : Architecture Cloud-Native (Floci.io MVP)
- **Date :** Juin 2026
- **Problème / Limite :** Le stockage local (TinyDB + fichiers audio sur disque) ne garantissait pas la scalabilité pour 10 000+ audios, et empêchait de tester le code en conditions cloud (AWS).
- **Résolution :** Déploiement de l'émulateur AWS local **Floci.io** via Docker. Les fichiers audio sont désormais stockés dans `Amazon S3` et les métadonnées/annotations dans `Amazon DynamoDB`. Le backend FastAPI a été refondu. Note sur l'image Docker : les registres GitHub/ECR publics contenant des versions obsolètes/privées de Floci ont échoué, l'image `hectorvent/floci:latest` depuis le Docker Hub s'est avérée être la version officielle et opérationnelle.

## Entrée 10 : Incompatibilité Uvicorn & Sous-processus sous Windows
- **Date :** Juin 2026
- **Problème / Échec Critique :** Lors du lancement de la collecte depuis l'interface d'administration web, le backend FastAPI déclenchait une erreur `NotImplementedError` instantanée. Cela est dû au fait qu'Uvicorn utilise la boucle `SelectorEventLoop` par défaut sous Windows, laquelle ne supporte pas `asyncio.create_subprocess_shell`.
- **Résolution :** Modification du pipeline de traitement (`server.py`) pour déléguer les appels `subprocess.run` synchrones dans un thread séparé via `asyncio.to_thread`. Cela permet de garder l'API asynchrone sans bloquer la boucle d'événements, tout en esquivant l'incompatibilité Windows.

## Entrée 11 : Intégrité des données et Theme Toggle Dynamique
- **Date :** Juin 2026
- **Problème / UX :** Le panel d'administration premium avait des couleurs hardcodées (mode sombre strict), cassant l'expérience pour les utilisateurs en mode clair. Par ailleurs, les erreurs d'ingestion ou audios invalides polluaient la base (pas de moyen de suppression simple).
- **Résolution :** 
  - Modification intégrale de l'interface admin (`App.jsx`) pour exploiter les variables CSS du `[data-theme='light']` et `[data-theme='dark']` (`var(--card-bg)`, etc.). 
  - Ajout d'une fonctionnalité de Suppression en cascade. Côté backend, une requête `DELETE /admin/audios/{id}` supprime l'enregistrement de l'audio (`Audios`), efface toutes ses occurrences segmentées (`Segments`), et ordonne à S3 de détruire le `.wav` lourd, maintenant l'hygiène de la base de données.

## Entrée 12 : Goulot d'étranglement de l'inférence locale (Whisper)
- **Date :** Juin 2026
- **Problème / Limite Hardware :** Lors des tests système, le PI a remarqué que "l'analyse temporelle et découpage en segment prend du temps. Est-ce normal même pour une vidéo de 5 minutes ?". Oui, en l'état, l'exécution locale de `Whisper 'base'` monopolise le CPU et n'exploite pas d'accélération matérielle (CUDA), ce qui rend le processus de transcription phonétique excessivement lent.
- **Résolution (Théorique) :** Pour un MVP, ce délai est documenté et affiché via le terminal interactif en temps réel pour rassurer l'utilisateur (affichage de "Chargement du modèle..."). Pour la V2 (Production), cette étape devra impérativement être asynchrone et déléguée à une infrastructure cloud spécialisée (ex: AWS SageMaker, Lambda ou un service EC2 avec GPU T4).

## Entrée 13 : Incident de Troncature JSX (Crash Silencieux du Frontend)
- **Date :** Juin 2026
- **Problème / Bug :** Lors de la refonte du composant `AdminPanel` vers un design "Premium", le retour de code a été accidentellement tronqué, générant des balises non fermées (ex: `</tbody>` résiduelles) et supprimant les onglets "Ingestion" et "Bibliothèque" du DOM, sans faire crasher le compilateur Vite immédiatement.
- **Résolution Scientifique :** Intervention chirurgicale avec l'outil de multi-remplacement plutôt que de générer à nouveau tout le fichier. Ensuite, pour garantir une intégrité parfaite de la syntaxe JSX (et l'ajout fluide du support Light/Dark), l'intégralité du composant a été réécrite et injectée proprement. Cet incident rappelle la nécessité de segmenter les composants React volumineux en sous-fichiers pour limiter les risques de corruption.
