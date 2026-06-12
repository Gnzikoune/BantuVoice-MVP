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

### Module d'Annotation Web (Phase 4)

L'interface d'annotation permet aux linguistes de corriger et de valider les segments générés par l'IA. Conformément au cadre scientifique, elle intègre une base de données (`TinyDB`) et une authentification stricte (`JWT`) pour garantir la traçabilité de la Double Annotation.

**0. Sécurité (Configuration Initiale) :**
Copiez le fichier `.env.example` et renommez-le en `.env` à la racine pour sécuriser vos mots de passe.

**1. Le Backend (FastAPI & Base de données) :**
À lancer dans un premier terminal :
```bash
# Activer l'environnement virtuel puis lancer le serveur
python src/api/server.py
```

**2. Le Frontend (React.js) :**
L'interface utilisateur. À lancer dans un second terminal :
```bash
cd src/frontend
npm run dev
```

---

## 🚀 Déploiement en Production (Serveur VPS)

Pour respecter la souveraineté des données (Section 5.2 de l'architecture), l'application est "conteneurisée" pour être déployée sur votre propre serveur Linux (ex: OVH, LIKUID) via Docker. Le code source contient donc une architecture **Monorepo**.

**1. Pré-requis sur le serveur :**
- Docker et Docker Compose installés.
- Avoir créé le fichier `.env` sur le serveur contenant vos clés JWT.

**2. Lancement en une commande :**
```bash
docker-compose up -d --build
```
Le Frontend (React) sera accessible sur le port HTTP classique (80), et le Backend (FastAPI) sur le port 8000. Les annotations et les audios sont sauvegardés sur le disque physique de manière persistante (Volume `./data`).

---

## ⚖️ Éthique et Souveraineté
- **Souveraineté :** Les corpus finaux restent sous le contrôle du CSGR-IA.
- **Transparence :** Consultez le fichier [`RESEARCH_LOG.md`](./RESEARCH_LOG.md) qui trace toutes nos décisions scientifiques, nos échecs méthodologiques (ex: Hallucinations de Whisper) et nos résolutions.
- **Sécurité :** Les secrets ne sont jamais commités, et le code est conçu pour gérer les erreurs externes de manière résiliente.

*Porteurs de projet : Gildas & Aryad (Pôle Technique & Innovation, CSGR-IA).*
