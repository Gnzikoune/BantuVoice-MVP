"""
Module de collecte automatisée d'audio via yt-dlp.

Ce module est responsable du téléchargement de l'audio pur depuis une vidéo YouTube,
conformément aux exigences du projet BantuVoice (WAV, 16kHz, mono).
"""

import os
import json
from datetime import datetime
import yt_dlp

def download_audio(video_url: str, output_dir: str = "data/raw") -> bool:
    """
    Télécharge l'audio d'une vidéo YouTube au format WAV (16kHz, mono).

    Args:
        video_url (str): L'URL de la vidéo YouTube à télécharger.
        output_dir (str): Le dossier de destination pour l'audio. Par défaut: "data/raw".

    Returns:
        bool: True si le téléchargement a réussi, False en cas d'erreur.
    """
    # Création du dossier de destination s'il n'existe pas (Robustesse)
    os.makedirs(output_dir, exist_ok=True)

    # Configuration stricte de yt-dlp pour correspondre au cahier des charges
    ydl_opts = {
        'format': 'bestaudio/best', # Sélectionne le meilleur flux audio natif
        'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'), # Nommage sécurisé via ID YouTube
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',   # Format imposé par l'architecture
            'preferredquality': '192',
        }],
        'postprocessor_args': [
            '-ar', '16000', # Forçage à 16 kHz (idéal pour Whisper)
            '-ac', '1'      # Forçage en Mono (idéal pour Whisper)
        ],
        'extractor_args': {
            'youtube': ['player_client=default'] # [SECURITE] Contournement des erreurs 403 de YouTube
        },
        'ffmpeg_location': r'C:\Users\hp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin',
        'quiet': False,     # Affichage de la progression
        'no_warnings': True # Nettoyage des logs console
    }

    try:
        # Exécution dans un bloc 'with' pour gérer proprement les ressources
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # extract_info télécharge ET retourne le dictionnaire complet des métadonnées
            info_dict = ydl.extract_info(video_url, download=True)
            video_id = info_dict.get('id', 'unknown_id')
            
            # Structuration des métadonnées selon le Cahier des Charges BantuVoice
            metadata = {
                "source_id": video_id, 
                "language_code": "unknown", # Sera mis à jour plus tard par l'annotateur ou l'IA
                "audio_path": f"{output_dir}/{video_id}.wav",
                "duration_seconds": info_dict.get('duration', 0),
                "publication_date": info_dict.get('upload_date', 'unknown'),
                "channel_name": info_dict.get('uploader', 'unknown'),
                "quality_flag": "medium", # Qualité par défaut (sera mesurée via le SNR par Aryad)
                "collection_date": datetime.now().strftime("%Y-%m-%d")
            }
            
            # Sauvegarde des métadonnées en fichier JSON à côté de l'audio
            json_path = os.path.join(output_dir, f"{video_id}.json")
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=4)
                
        return True
    except Exception as e:
        # Catch explicite pour ne pas faire crasher un pipeline entier si une vidéo plante
        print(f"Erreur lors du téléchargement de {video_url} : {e}")
        return False

if __name__ == "__main__":
    # URL de test
    test_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw" # Première vidéo YouTube "Me at the zoo"
    print(f"Lancement de la collecte de test pour {test_url}...")
    
    success = download_audio(test_url)
    
    if success:
        print("Téléchargement réussi. Vérifiez le dossier data/raw/")
    else:
        print("Échec du téléchargement.")
