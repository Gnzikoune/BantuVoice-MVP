# BantuVoice 🌍🎙️

**Initiative nationale de données linguistiques pour l'IA — CSGR-IA**

*L'Intelligence Artificielle · pour l'Afrique · par l'Afrique · portée par le CSGR-IA*

---

## 📌 Contexte du Projet
88% des langues africaines sont absentes de l'IA mondiale. Les langues gabonaises (Fang, Punu, Obamba, etc.) n'existent dans aucun modèle comme Whisper ou GPT, faute de données structurées.

**BantuVoice** est la première infrastructure souveraine de données linguistiques d'Afrique centrale. L'objectif est de collecter l'audio existant (traditions orales, chaînes YouTube comme *Dumwénu TV*), de le transcrire par IA, et de le valider via des locuteurs natifs pour créer un corpus de très haute qualité au standard Hugging Face.

---

## 🏗️ Architecture Technique (Le Pipeline)

Le projet est divisé en trois modules autonomes :

1. **Étape 01 : Collecte Automatisée** `(EN COURS)`
   - Outil : `yt-dlp` (avec post-processing `ffmpeg`).
   - Rôle : Télécharger massivement l'audio depuis des sources ciblées au format imposé par les modèles ASR (`WAV`, `16kHz`, `mono`).
   - Métadonnées : Extraction automatique en JSON.

2. **Étape 02 : Segmentation Audio par IA (Whisper VAD)** `(TERMINÉ)`
   - Outil : `Whisper` (OpenAI).
   - Rôle Scientifique : Les langues gabonaises n'étant pas supportées nativement par l'IA, Whisper est utilisé *exclusivement* comme outil de segmentation spatio-temporelle (VAD - Voice Activity Detection). Il découpe intelligemment l'audio en courts segments horodatés (sans altérer le sens), préparant le terrain pour l'annotation humaine depuis une base propre.

3. **Étape 03 : Validation Scientifique (Double Annotation)** `(MVP TERMINÉ)`
   - Stack : `React.js` (Frontend), `FastAPI` (Backend), `TinyDB` (Base de données locale de transition), `JWT` (Sécurité).
   - Rôle : Interface web sécurisée imposant un protocole de "Double Annotation en aveugle". Deux linguistes traduisent le même segment sans voir le travail de l'autre, permettant le calcul du taux d'accord inter-annotateurs (ex: Cohen's Kappa) exigé par les standards internationaux.

4. **Étape 04 : Export et Publication (Hugging Face)** `(À VENIR)`
   - Format : `Apache Parquet` + `Dataset Card`.
   - Rôle : Une fois le volume cible atteint, un script extraira les segments doublement validés de la base de données pour générer le corpus final publiable.

---

## 🚀 Installation & Prérequis

### 1. Prérequis Système
- **Python 3.10+**
- **FFmpeg** installé et accessible dans la variable `PATH` de votre système (nécessaire pour la conversion audio). Sous Windows, vous pouvez utiliser `winget install ffmpeg`.

### 2. Installation de l'environnement
Clonez le dépôt, puis créez un environnement virtuel :
```bash
python -m venv venv
# Activer l'environnement (Windows)
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

---

## 📖 Utilisation du Pipeline

### Module de Collecte (`src/collecte/downloader.py`)

Le script de collecte fonctionne via une Interface en Ligne de Commande (CLI). Il peut aspirer une vidéo unique ou une chaîne entière.

**Option A : Télécharger une URL spécifique**
```bash
python src/collecte/downloader.py --url "https://www.youtube.com/watch?v=..."
```

**Option B : Utiliser le registre de sources (Téléchargement de masse)**
Remplissez le fichier `config/sources.json` en y activant (`"status": "active"`) les chaînes ou playlists à aspirer, puis lancez :
```bash
python src/collecte/downloader.py --registry config/sources.json
```

### Module de Transcription (`src/transcription/transcriber.py`)

Ce script utilise l'IA pour transcrire l'audio et générer les segments horodatés (injectés automatiquement dans le fichier `.json`).

**Usage Basique :**
```bash
python src/transcription/transcriber.py --audio "data/raw/ID_VIDEO.wav"
```

**Usage Avancé (Langues à faibles ressources) :**
Pour contourner l'absence des langues gabonaises dans l'IA, forcez un alphabet phonétique proche (ex: `fr`) et donnez un contexte (prompt) :
```bash
python src/transcription/transcriber.py --audio "data/raw/ID_VIDEO.wav" --language "fr" --prompt "Voici une transcription d'une langue bantu (Fang) d'Afrique centrale utilisant l'alphabet latin."
```

## 🚀 Installation & Déploiement

L'application utilise une architecture **Monorepo** (Backend + Frontend) pour faciliter son déploiement.
Pour respecter la souveraineté des données, l'application est conçue pour être déployée sur votre propre serveur Linux (VPS) ou ordinateur local.

### Option 1 : Déploiement Production (Recommandé - via Docker)
C'est la méthode la plus simple et la plus propre, idéale pour un serveur VPS (ex: OVH, LIKUID).
1. Installez [Docker](https://docs.docker.com/get-docker/) et Docker Compose.
2. Clonez le dépôt et créez votre fichier de configuration de sécurité :
   ```bash
   git clone https://github.com/Gnzikoune/BantuVoice-MVP.git
   cd BantuVoice-MVP
   cp .env.example .env
   ```
3. *(Optionnel)* Modifiez le fichier `.env` pour définir un vrai mot de passe secret.
4. Lancez l'intégralité du projet en une commande :
   ```bash
   docker-compose up -d --build
   ```
Le portail sera accessible sur le port HTTP classique (`http://localhost` ou l'IP de votre serveur). Les données audio et la base de données sont sauvegardées de manière persistante dans le dossier `./data/`.

---

### Option 2 : Développement Local (Manuel)
Si vous êtes un développeur et souhaitez modifier le code source :

**Pré-requis :** Python 3.10+, Node.js 18+, FFmpeg installé sur le système.

**1. Le Backend (FastAPI) :**
```bash
# Dans le dossier racine du projet
python -m venv venv
source venv/bin/activate  # (Sous Windows : venv\Scripts\activate)
pip install -r requirements.txt
cp .env.example .env
python src/api/server.py
```
*Le backend sera lancé sur http://127.0.0.1:8000*

**2. Le Frontend (React.js) :**
Dans un second terminal :
```bash
cd src/frontend
npm install
npm run dev
```
*L'interface utilisateur sera lancée sur le port par défaut de Vite (généralement 5173).*

---

---

## 🤝 Contribuer au Projet

Si vous rejoignez l'équipe technique, votre première étape obligatoire est de lire le **[Guide de Contribution (CONTRIBUTING.md)](./CONTRIBUTING.md)**. Il détaille le Workflow Git (Branches, Pull Requests) et les obligations de rigueur scientifique.

---

## ⚖️ Éthique et Souveraineté
- **Souveraineté :** Les corpus finaux restent sous le contrôle du CSGR-IA.
- **Transparence :** Consultez le fichier [`RESEARCH_LOG.md`](./RESEARCH_LOG.md) qui trace toutes nos décisions scientifiques, nos échecs méthodologiques (ex: Hallucinations de Whisper) et nos résolutions.
- **Sécurité :** Les secrets ne sont jamais commités, et le code est conçu pour gérer les erreurs externes de manière résiliente.

*Porteurs de projet : Gildas & Aryad (Pôle Technique & Innovation, CSGR-IA).*
