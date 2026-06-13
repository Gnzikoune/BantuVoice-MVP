# Règles de Travail et de Traçabilité pour l'IA (BantuVoice)

> **IMPORTANT :** En tant qu'IA, je m'engage à lire, comprendre et respecter scrupuleusement ces règles tout au long du développement du projet BantuVoice. Ce document est la référence absolue de notre façon de travailler ensemble.

---

## §1. Traçabilité Git Extrême (Hyper-Granularité)

- **Une action = Un commit.** Chaque modification, ajout de fonction, correction de bug, ou même ajout de documentation doit faire l'objet d'un commit distinct.
- **Jamais de commits groupés.** Ne jamais mélanger la création d'un fichier et sa modification ultérieure dans le même commit.
- **Convention de nommage stricte :** Utiliser les *Conventional Commits* pour chaque message :
  | Préfixe | Usage |
  |---------|-------|
  | `feat:` | Nouvelle fonctionnalité |
  | `fix:` | Correction de bug |
  | `docs:` | Documentation uniquement |
  | `chore:` | Maintenance (nettoyage, dépendances) |
  | `refactor:` | Réécriture de code sans changement de comportement |
  | `style:` | Mise en forme UI/CSS, pas de logique |
  | `release:` | Création d'un tag de version stable |

- **Messages détaillés :** Pour les commits complexes, inclure un "body" expliquant *pourquoi*, pas seulement *quoi*.

---

## §2. Documentation Exhaustive & Continue

- **Commentaires en ligne :** Chaque bloc de code non-trivial doit expliquer l'*intention*, pas la mécanique.
- **Docstrings obligatoires :** Toute fonction, classe ou module Python doit inclure une Docstring (paramètres, retour, rôle dans le pipeline).
- **RESEARCH_LOG.md — Règle Fondamentale :** Tout bug critique, toute décision architecturale, et toute erreur bloquante **doit** être documentée dans [`RESEARCH_LOG.md`](./RESEARCH_LOG.md). L'IA doit systématiquement ajouter une nouvelle entrée numérotée après chaque résolution. Ne jamais "corriger en silence".
- **Mise à jour du README :** Toute nouvelle fonctionnalité ou route API ajoutée doit être reflétée dans [`README.md`](./README.md) (tableau API, fonctionnalités, etc.).

---

## §3. Méthodologie Pas-à-Pas

- Ne jamais coder de larges blocs en une seule fois sans validation intermédiaire.
- Proposer la modification, l'expliquer, l'implémenter, puis la commiter immédiatement.
- Si une modification entraîne une régression ou un bug, la diagnostiquer et documenter la résolution avant de poursuivre.

---

## §4. Souveraineté et Architecture

- Maintenir le code propre, modulaire et auditable scientifiquement.
- **Architecture Cloud-Native (Floci.io / AWS) :** Toute donnée persistante (audios, segments, langues, utilisateurs) doit passer par les services AWS simulés localement :
  - **Audios bruts** → Amazon S3 (bucket `bantuvoice-audios`)
  - **Métadonnées, segments, langues, utilisateurs** → Amazon DynamoDB
- **Aucune donnée hardcodée.** Les listes extensibles (ex: langues supportées) doivent être stockées en base de données, jamais en constante Python.

---

## §5. Sécurité Maximale (Best Practices)

- **Gestion des Secrets :** Ne jamais coder en dur de clés API, mots de passe, ou tokens. Toujours utiliser les variables d'environnement via `.env` (voir `.env.example`).
- **Sanitisation :** Valider et nettoyer toutes les entrées utilisateur (URL YouTube, codes de langue, etc.).
- **Principe du Moindre Privilège :** Les routes admin (`/admin/*`) doivent systématiquement vérifier le rôle via `Depends(require_admin)`. Les linguistes ne doivent jamais pouvoir accéder aux endpoints d'administration.
- **JWT :** Les tokens d'accès ont une durée de vie limitée (24h). Ne jamais stocker de token en clair côté serveur.

---

## §6. Historique des Décisions et Gestion des Erreurs (ADR & Bug Tracking)

- **Choix Technologiques :** Tout changement d'architecture (ex: *TinyDB → DynamoDB*, *hardcodé → DynamoDB dynamique*) doit être justifié dans le `RESEARCH_LOG.md` avec comparaison des alternatives.
- **Bugs :** Chaque bug résolu = une nouvelle entrée dans `RESEARCH_LOG.md` avec : le problème rencontré, l'hypothèse, l'expérimentation, et la résolution.
- **Zéro fichier de test en production :** Les scripts de débogage temporaires (`debug_*.py`, `test_*.py`) doivent être supprimés dès que leur usage est terminé. Ils ne doivent jamais être commités sur la branche principale.

---

## §7. Gestion des Versions (Releases GitHub)

- **Principe :** Une Release GitHub est une "photo officielle et immuable" du projet à une étape clé. Elle permet à l'équipe de revenir à un état stable à tout moment, et aux partenaires du CSGR-IA de suivre l'avancement formel du projet.

- **Quand créer une Release ?** À chaque jalon majeur du projet :
  | Version | Jalon correspondant |
  |---------|---------------------|
  | `v0.1.0-mvp` | MVP fonctionnel : Pipeline d'ingestion + Annotation + Dashboard Admin |
  | `v0.2.0` | Première fonctionnalité majeure post-MVP (ex: export CSV, gestion multi-utilisateurs) |
  | `v1.0.0` | Premier corpus publié sur Hugging Face, prêt pour la communauté scientifique |

- **Comment créer une Release ?**
  ```bash
  # 1. Créer un tag Git annoté
  git tag -a v0.1.0-mvp -m "MVP BantuVoice : Pipeline + Admin Dashboard + Double Annotation"
  
  # 2. Pousser le tag
  git push origin v0.1.0-mvp
  
  # 3. Créer la Release sur GitHub avec des notes de version claires
  # (via l'interface GitHub ou gh CLI)
  ```

- **Notes de version (Changelog) :** Chaque Release doit inclure :
  - ✅ Ce qui a été ajouté
  - 🐛 Ce qui a été corrigé
  - ⚠️ Les changements potentiellement cassants (breaking changes)

- **Packages GitHub :** Non utilisé pour l'instant. À envisager uniquement si les scripts d'export sont publiés comme bibliothèque Python réutilisable (`pip install bantuvoice-tools`).

---

## §8. Hygiène du Dépôt

- **`.gitignore` strict :** Les fichiers `venv/`, `data/raw/`, `data/segments/`, `__pycache__/`, `*.env`, `node_modules/` ne doivent jamais être commités.
- **Nettoyage régulier :** Les fichiers de test, de debug, ou les scripts temporaires doivent être supprimés dès qu'ils ne sont plus utiles. Un dépôt propre = un projet professionnel.

---

## §9. Stratégie de Branches Git (Feature Branch Workflow)

> **Règle fondamentale :** Chaque fonctionnalité, correction, ou amélioration = une branche dédiée. On ne travaille jamais directement sur `main`.

### Convention de nommage des branches

| Préfixe | Usage | Exemple |
|---------|-------|---------|
| `feat/` | Nouvelle fonctionnalité | `feat/s3-presigned-urls-annotateurs` |
| `fix/` | Correction de bug | `fix/syntaxerror-pipeline-etape3` |
| `refactor/` | Réécriture sans changement fonctionnel | `refactor/whisper-vers-faster-whisper` |
| `docs/` | Documentation uniquement | `docs/floci-aws-cli` |
| `chore/` | Maintenance, dépendances | `chore/update-requirements` |
| `release/` | Préparation d'une release | `release/v0.1.0-mvp` |

### Cycle de vie d'une branche

```
main
 └── feat/ma-fonctionnalite        ← créer la branche
       │── commit 1 (feat: ...)    ← travailler en micro-commits
       │── commit 2 (fix: ...)
       └── PR / merge → main       ← fusionner quand terminé et testé
           └── supprimer la branche après merge
```

### Commandes de référence

```bash
# Créer et basculer sur une nouvelle branche
git checkout -b feat/nom-de-la-fonctionnalite

# Pousser la branche sur GitHub
git push origin feat/nom-de-la-fonctionnalite

# Fusionner dans main (après validation)
git checkout main
git merge --no-ff feat/nom-de-la-fonctionnalite
git push origin main

# Supprimer la branche locale et distante après merge
git branch -d feat/nom-de-la-fonctionnalite
git push origin --delete feat/nom-de-la-fonctionnalite
```

### Règles de protection de `main`

- `main` = code stable, **toujours déployable**.
- Jamais de `git push --force` sur `main`.
- Tout merge sur `main` doit passer par un commit de merge explicite (`--no-ff`).
- Si une modification urgente est nécessaire directement : créer une branche `fix/nom-du-bug` et merger rapidement.

---

*Dernière mise à jour : 13 Juin 2026 — Porteurs de projet : Gildas & Aryad (Pôle Technique & Innovation, CSGR-IA)*
