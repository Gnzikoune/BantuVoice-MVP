# Règles de Travail et de Traçabilité pour l'IA (BantuVoice)

> **IMPORTANT :** En tant qu'IA, je m'engage à lire, comprendre et respecter scrupuleusement ces règles tout au long du développement du projet BantuVoice.

## 1. Traçabilité Git Extrême (Hyper-Granularité)
- **Une action = Un commit.** Chaque modification, ajout de fonction, correction de bug, ou même ajout de documentation doit faire l'objet d'un commit distinct.
- **Jamais de commits groupés.** Ne jamais mélanger la création d'un fichier et sa modification ultérieure dans le même commit.
- **Convention de nommage stricte :** Utiliser les *Conventional Commits* pour chaque message (ex: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- **Messages détaillés :** Si la modification est complexe, le message de commit doit inclure une description (body) expliquant *pourquoi* ce changement a été fait.

## 2. Documentation Exhaustive
- **Commentaires en ligne :** Chaque ligne de code complexe doit être commentée pour expliquer *l'intention*.
- **Docstrings obligatoires :** Toute fonction, classe ou module créé doit inclure une Docstring standardisée expliquant ses paramètres, ce qu'elle retourne, et son rôle dans le pipeline BantuVoice.
- **Mise à jour des README :** Toute nouvelle brique logicielle doit être documentée dans le `README.md` correspondant.

## 3. Méthodologie Pas-à-Pas
- Ne jamais coder de larges blocs en une seule fois.
- Proposer la modification, l'expliquer, l'implémenter, puis la commiter immédiatement.
- Attendre la validation de l'utilisateur (Gildas) avant de passer à l'étape conceptuelle suivante.

## 4. Souveraineté et Architecture
- Maintenir l'architecture du code propre et modulaire.
- Toujours garder à l'esprit que le code produit a vocation à être auditable scientifiquement et reproductible.

## 5. Sécurité Maximale (Best Practices)
- **Gestion des Secrets :** Ne jamais coder en dur (hardcoder) de clés API, mots de passe, ou tokens dans le code source. Toujours utiliser des variables d'environnement (`.env`).
- **Sanitisation :** Valider et nettoyer toutes les entrées, même pour les scripts internes, afin d'éviter les failles d'injection ou les comportements imprévus.
- **Principe du Moindre Privilège :** Les accès (fichiers, bases de données) doivent être restreints au strict minimum nécessaire pour l'exécution d'une tâche.
