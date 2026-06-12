# 📖 Registre de Recherche (Research Log)

Conformément à la section **9.3 du Cadre Architectural**, ce document trace toutes les décisions méthodologiques, les expérimentations infructueuses (negative results) et les incidents techniques du projet BantuVoice.

> *"En science, une erreur documentée est scientifiquement utile. Une erreur dissimulée est une fraude."*

---

## Entrée 01 : Le Pivot "VAD" (Voice Activity Detection)
- **Date :** Juin 2026
- **Auteur :** Équipe Technique (Gildas & Agent IA)
- **Problème / Échec :** Lors des premiers tests sur une vidéo YouTube en langue Fang (`N4nFE0bWskg`), Whisper (OpenAI) a produit des hallucinations sévères. Forcé de transcrire avec l'alphabet français (`--language "fr"`), le modèle a collé des mots français incohérents sur des phonèmes Fang qu'il ne comprenait pas. Le Word Error Rate (WER) brut approchait les 100%.
- **Résolution Scientifique :** Changement de paradigme. Whisper a été rétrogradé d'outil de "traduction" à outil de "segmentation" (VAD). Il sert désormais uniquement à découper l'audio en segments de 3 à 30 secondes et à fournir une base phonétique. La transcription exacte est déléguée aux locuteurs natifs via la plateforme web.

## Entrée 02 : Simulation NoSQL via TinyDB
- **Date :** Juin 2026
- **Auteur :** Équipe Technique
- **Problème / Contrainte :** L'architecture (Section 5.2) exige MongoDB pour garantir la traçabilité des annotations. Or, la base n'était pas disponible en local pour le MVP, et le choix final (NoSQL vs SQL/PHP) était en attente de validation par l'équipe.
- **Résolution :** Intégration de `TinyDB`. Cette base de données orientée document (JSON) fonctionne exactement comme MongoDB sans nécessiter d'installation serveur. Cela a permis d'implémenter la logique de "Double Annotation" sans dévier du paradigme architectural.

## Entrée 03 : Faille de Sécurité sur la Double Annotation
- **Date :** Juin 2026
- **Problème / Incertitude :** Dans la première version du MVP React, la sélection de l'annotateur se faisait via un menu déroulant libre. Cela violait la Règle du Moindre Privilège et mettait en péril la rigueur de la Double Annotation en aveugle (usurpation d'identité possible).
- **Résolution :** Refonte immédiate de l'API FastAPI pour intégrer une authentification forte par **Token JWT**. L'interface React a été bloquée par un écran de connexion, garantissant que chaque annotation soumise est cryptographiquement liée au bon annotateur.

## Entrée 04 : Incompatibilité Passlib / Bcrypt (Bug Technique)
- **Date :** Juin 2026
- **Problème / Incident :** Lors du lancement du serveur sécurisé, la librairie `passlib` a causé un crash fatal (`AttributeError: module 'bcrypt' has no attribute '__about__'`). La version moderne de `bcrypt` (v5.0) n'est plus supportée par `passlib`.
- **Résolution :** L'architecture de hachage des mots de passe a été réécrite pour utiliser les méthodes natives de la librairie `bcrypt` (`hashpw` et `checkpw`), éliminant la dépendance défaillante.
