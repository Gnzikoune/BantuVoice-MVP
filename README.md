# BantuVoice 🌍🎙️

**Initiative nationale de données linguistiques pour l'IA — CSGR-IA**

*Scale AI · pour l'Afrique · fait par l'Afrique · porté par le CSGR-IA*

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

2. **Étape 02 : Transcription Automatique (IA)** `(À VENIR)`
   - Outil : `Whisper large-v3` (OpenAI).
   - Rôle : Transcrire l'audio brut en texte avec horodatage au niveau du mot (`WhisperX`).

3. **Étape 03 : Validation par Locuteurs Natifs** `(À VENIR)`
   - Stack : `React.js` (Frontend), `FastAPI` (Backend), `MongoDB` (Database).
   - Rôle : Interface web permettant la double annotation en aveugle et le calcul du taux d'erreur (WER).

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

---

## ⚖️ Éthique et Souveraineté
- **Souveraineté :** Les corpus finaux restent sous le contrôle du CSGR-IA.
- **Transparence :** Un registre de recherche trace toutes nos décisions scientifiques.
- **Sécurité :** Les secrets ne sont jamais commités, et le code est conçu pour gérer les erreurs externes de manière résiliente.

*Porteurs de projet : Gildas & Aryad (Pôle Technique & Innovation, CSGR-IA).*
