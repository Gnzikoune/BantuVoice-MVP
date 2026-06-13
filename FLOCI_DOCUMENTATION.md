# Documentation Floci.io & Commandes AWS (Émulateur Local)

## 1. Qu'est-ce que Floci ?
**Floci.io** est un émulateur cloud AWS complet conçu pour le développement local. Il permet de simuler des services AWS (S3, DynamoDB, SQS, Lambda, etc.) directement sur votre machine locale via Docker, sans avoir besoin d'une connexion internet, d'une carte bancaire, ou d'un compte AWS.
Dans BantuVoice, Floci est utilisé pour émuler **Amazon S3** (stockage des fichiers audios WAV) et **Amazon DynamoDB** (base de données NoSQL pour les utilisateurs, les métadonnées audio, et les segments annotés).

## 2. Configuration dans BantuVoice
- **Image Docker :** `hectorvent/floci:latest`
- **Port d'accès :** `4566` (URL de l'API : `http://localhost:4566`)
- **Région :** `eu-west-3`
- **Identifiants factices AWS :** `test` / `test`

## 3. Comment interagir avec Floci (Le "Panneau de Contrôle" du Développeur)
Pour vérifier que les données sont bien enregistrées dans Floci (comme vous le feriez sur la console AWS), vous devez utiliser la ligne de commande officielle **AWS CLI**. Floci se comporte exactement comme le vrai AWS pour cet outil.

### A. Prérequis : Installer AWS CLI
1. Téléchargez et installez AWS CLI pour Windows depuis le [site officiel](https://aws.amazon.com/fr/cli/).
2. Ouvrez un terminal PowerShell et configurez vos identifiants factices :
   ```powershell
   aws configure
   ```
   *Répondez aux questions ainsi :*
   - **AWS Access Key ID :** `test`
   - **AWS Secret Access Key :** `test`
   - **Default region name :** `eu-west-3`
   - **Default output format :** `json`

### B. Commandes pour inspecter Amazon S3 (Fichiers Audios)
Toutes les requêtes vers Floci nécessitent le paramètre `--endpoint-url http://localhost:4566` pour indiquer à AWS CLI de ne pas interroger le vrai internet, mais votre émulateur local.

- **Lister tous les buckets S3 :**
  ```powershell
  aws s3api list-buckets --endpoint-url http://localhost:4566
  ```

- **Lister les fichiers audios contenus dans le bucket BantuVoice :**
  ```powershell
  aws s3 ls s3://bantuvoice-audios/audios/ --endpoint-url http://localhost:4566
  ```

- **Télécharger manuellement un audio depuis le stockage local (pour vérification) :**
  ```powershell
  aws s3 cp s3://bantuvoice-audios/audios/nom_du_fichier.wav ./fichier_test.wav --endpoint-url http://localhost:4566
  ```

### C. Commandes pour inspecter DynamoDB (Base de données)
- **Lister toutes les tables existantes :**
  ```powershell
  aws dynamodb list-tables --endpoint-url http://localhost:4566
  ```

- **Voir tout le contenu de la table "Users" :**
  ```powershell
  aws dynamodb scan --table-name Users --endpoint-url http://localhost:4566
  ```

- **Voir tout le contenu de la table "Audios" (la bibliothèque) :**
  ```powershell
  aws dynamodb scan --table-name Audios --endpoint-url http://localhost:4566
  ```

- **Voir tout le contenu de la table "Segments" (les annotations) :**
  ```powershell
  aws dynamodb scan --table-name Segments --endpoint-url http://localhost:4566
  ```

- **Compter combien de segments existent au total :**
  ```powershell
  aws dynamodb scan --table-name Segments --select "COUNT" --endpoint-url http://localhost:4566
  ```

## 4. Outils Graphiques (GUI) Recommandés
Si vous préférez une interface visuelle plutôt que la ligne de commande pour observer vos bases de données et fichiers S3 dans Floci, vous pouvez utiliser :
1. **NoSQL Workbench pour DynamoDB :** Un outil gratuit d'Amazon. Vous pouvez y ajouter une connexion personnalisée pointant vers `localhost` sur le port `4566`.
2. **Cyberduck (ou WinSCP) :** Permet de se connecter à des stockages S3 compatibles. Utilisez `http://localhost:4566`, l'Access Key `test`, et la Secret Key `test`.
3. **AWS Explorer (Extension VS Code) :** Vous pouvez la configurer pour utiliser un profil avec l'endpoint local `4566`.

## 5. Comment ça fonctionnera en Production ?
Le jour où l'application passera sur un "vrai" VPS avec un vrai compte AWS :
1. Vous changerez la variable `AWS_ENDPOINT_URL` dans le `.env` pour la vider (ce qui dira au backend de pointer vers les vrais serveurs d'Amazon).
2. Vous changerez `test`/`test` par les véritables clés d'API générées sur la vraie console web AWS IAM.
3. Le code source de l'application **n'aura pas besoin de changer d'une seule ligne**. L'application croira simplement que Floci a été remplacé par le vrai AWS.
