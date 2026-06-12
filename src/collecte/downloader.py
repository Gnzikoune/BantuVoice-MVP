"""
Module de collecte automatisée d'audio via yt-dlp.

Ce module est responsable du téléchargement de l'audio pur depuis des chaînes YouTube
ou des vidéos uniques, conformément aux exigences du projet BantuVoice.
"""

import os
import json
import argparse
from datetime import datetime
import yt_dlp

def create_bantuvoice_metadata(info_dict: dict, output_dir: str):
    """
    Crée et sauvegarde le fichier JSON de métadonnées pour une vidéo téléchargée.
    Cette fonction est appelée par le Hook yt-dlp après chaque vidéo.
    """
    video_id = info_dict.get('id', 'unknown_id')
    
    metadata = {
        "source_id": video_id, 
        "language_code": "unknown", # À compléter manuellement ou via pipeline IA
        "audio_path": os.path.join(output_dir, f"{video_id}.wav").replace("\\", "/"),
        "duration_seconds": info_dict.get('duration', 0),
        "publication_date": info_dict.get('upload_date', 'unknown'),
        "channel_name": info_dict.get('uploader', 'unknown'),
        "quality_flag": "medium",
        "collection_date": datetime.now().strftime("%Y-%m-%d")
    }
    
    json_path = os.path.join(output_dir, f"{video_id}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=4)
    print(f"[METADATA] Fichier JSON créé : {json_path}")

def postprocessor_hook(d):
    """
    Hook exécuté par yt-dlp à différentes étapes.
    On intercepte l'étape de fin de post-processing (après la conversion WAV)
    pour générer notre fichier JSON.
    """
    if d['status'] == 'finished':
        # Le dictionnaire 'info_dict' contient toutes les métadonnées de la vidéo
        info = d.get('info_dict', {})
        # On récupère le dossier de sortie configuré dynamiquement
        output_dir = os.path.dirname(d.get('info_dict', {}).get('filepath', 'data/raw'))
        create_bantuvoice_metadata(info, output_dir)

def download_source(url: str, output_dir: str = "data/raw") -> bool:
    """
    Télécharge l'audio d'une ou plusieurs vidéos YouTube (chaîne/playlist) 
    au format WAV (16kHz, mono).
    """
    os.makedirs(output_dir, exist_ok=True)

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'postprocessor_args': [
            '-ar', '16000',
            '-ac', '1'
        ],
        'extractor_args': {
            'youtube': ['player_client=default']
        },
        'ffmpeg_location': r'C:\Users\hp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin',
        'quiet': False,
        'no_warnings': True,
        'ignoreerrors': True # Continuer même si une vidéo d'une playlist est bloquée ou supprimée
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # On attache notre écouteur (Hook) qui s'exécutera après la conversion FFmpeg
            ydl.add_post_processor_hook(postprocessor_hook)
            # On lance le téléchargement (qui gère tout seul vidéos, playlists, ou chaînes)
            ydl.download([url])
        return True
    except Exception as e:
        print(f"Erreur lors du téléchargement de {url} : {e}")
        return False

def process_registry(registry_path: str, output_dir: str = "data/raw"):
    """
    Lit un fichier JSON de registre de sources et lance le téléchargement
    pour toutes les sources actives.
    """
    if not os.path.exists(registry_path):
        print(f"Le registre {registry_path} n'existe pas.")
        return

    with open(registry_path, 'r', encoding='utf-8') as f:
        sources = json.load(f)
    
    for source in sources:
        if source.get("status") == "active":
            print(f"\n=== Lancement de la collecte pour la source : {source.get('channel_id')} ===")
            download_source(source.get("url"), output_dir)
        else:
            print(f"\n=== Source {source.get('channel_id')} ignorée (status: inactive) ===")

if __name__ == "__main__":
    # Mise en place de l'interface en ligne de commande (CLI)
    parser = argparse.ArgumentParser(description="Pipeline de Collecte BantuVoice (yt-dlp)")
    
    # Groupe d'arguments exclusifs : soit on passe une URL, soit on passe un registre
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--url", type=str, help="URL d'une vidéo, playlist ou chaîne YouTube à télécharger")
    group.add_argument("--registry", type=str, help="Chemin vers le fichier JSON de registre des sources")
    
    parser.add_argument("--output", type=str, default="data/raw", help="Dossier de destination (défaut: data/raw)")
    
    args = parser.parse_args()

    if args.url:
        download_source(args.url, args.output)
    elif args.registry:
        process_registry(args.registry, args.output)
