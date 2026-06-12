# 🤝 Guide de Contribution : BantuVoice-MVP

Bienvenue dans l'équipe de développement de **BantuVoice** ! 
En tant que membre du Pôle Technique & Innovation du CSGR-IA, vous participez à la création de la première infrastructure souveraine de données linguistiques d'Afrique centrale.

Ce document dicte les règles de développement incontournables. **Toute dérogation entraînera le refus de votre code.**

---

## 1. L'Installation (Onboarding)

Le projet utilise une architecture **Monorepo** (le backend Python et le frontend React cohabitent) et s'appuie sur Docker pour garantir la reproductibilité.

1. **Cloner le projet** :
   ```bash
   git clone https://github.com/Gnzikoune/BantuVoice-MVP.git
   cd BantuVoice-MVP
   ```
2. **Configuration Sécurité** :
   Copiez le fichier d'exemple pour créer vos variables d'environnement locales. Demandez la clé JWT au Chef de Projet (PI).
   ```bash
   cp .env.example .env
   ```
3. **Lancement (Local ou Serveur)** :
   ```bash
   docker-compose up -d --build
   ```
   *L'application est disponible sur le port 80 (Frontend) et 8000 (Backend).*

---

## 2. Le Workflow Git (Git Flow)

> [!CAUTION]
> **Il est strictement interdit de coder ou de pousser directement sur la branche `main`.**

1. **Créer une branche de fonctionnalité** (Feature branch) :
   À chaque nouvelle tâche, créez une branche depuis `main`.
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/nom-de-votre-fonctionnalite
   ```

2. **Micro-Commits et Traçabilité** :
   Nous exigeons des *Conventional Commits* granuleux. Un commit = une action logique.
   - 🟢 Autorisé : `git commit -m "feat(ui): ajout du mode sombre sur le dashboard"`
   - 🔴 Interdit : `git commit -m "maj du projet"`

3. **Soumettre votre travail (Pull Request)** :
   Une fois terminé, poussez votre branche et allez sur GitHub pour ouvrir une *Pull Request* (PR).
   ```bash
   git push origin feature/nom-de-votre-fonctionnalite
   ```
   Le Chef de Projet (Gildas) fera une revue de votre code (Code Review) avant de le fusionner dans `main`.

---

## 3. L'Obligation Scientifique (Research Log)

BantuVoice est un projet académique. **Vous n'êtes pas seulement un développeur, vous êtes un chercheur.**

- Si vous tentez une nouvelle technologie (ex: un autre modèle IA) et qu'elle échoue : Vous devez le documenter.
- Si vous prenez une décision architecturale (ex: changer de base de données) : Vous devez la justifier.

Avant de soumettre votre *Pull Request*, vous avez l'obligation absolue de mettre à jour le fichier [`RESEARCH_LOG.md`](./RESEARCH_LOG.md) avec vos découvertes ou vos échecs (Negative Results).

---

## 4. Cadre IA & Sécurité
Si vous utilisez un assistant IA pour coder, vous devez impérativement lui faire lire le fichier [`AI_WORKFLOW_RULES.md`](./AI_WORKFLOW_RULES.md) avant de commencer la session. Ce fichier interdit à l'IA de hardcoder des mots de passe ou de générer des commits opaques.
