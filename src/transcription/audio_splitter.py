"""
Module de découpage audio par segments (Étape 02.5 du pipeline BantuVoice).

Rôle dans le pipeline :
    data/raw/{id}.wav  +  data/raw/{id}.json  →  data/segments/{id}/seg_{n:04d}.wav

Ce module lit les timestamps (start/end) produits par transcriber.py et découpe
le fichier WAV source en clips individuels via FFmpeg (-c copy = sans réencodage,
quasi-instantané).

Décision architecturale (RESEARCH_LOG Entrée 16) :
    Le découpage audio est séparé de la transcription pour deux raisons :
    1. Séparation des responsabilités : transcription ≠ manipulation audio.
    2. Permettre le re-découpage à la demande (ex: si les timestamps changent après correction).
"""

import os
import json
import argparse
import subprocess
import glob
import sys

# Forcer l'encodage UTF-8 en sortie pour eviter les erreurs cp1252 sur Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv()

# SÉCURITÉ (AI_WORKFLOW_RULES §5) : chemin FFmpeg via variable d'environnement.
FFMPEG_BIN = os.getenv(
    "FFMPEG_PATH",
    r"C:\Users\hp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
)
FFMPEG_EXE = os.path.join(FFMPEG_BIN, "ffmpeg.exe")

# Dossier racine des segments découpés
SEGMENTS_ROOT = os.getenv("SEGMENTS_DIR", "data/segments")


def split_audio_from_json(audio_path: str, output_dir: str = None) -> dict:
    """
    Découpe un fichier WAV en clips individuels à partir des timestamps JSON.

    Paramètres :
        audio_path : Chemin vers le fichier .wav source (ex: data/raw/O97sabwUu6Y.wav).
        output_dir : Dossier de sortie des clips. Si None, utilise data/segments/{audio_id}/.

    Retourne :
        dict avec les clés :
            'success'     : bool — True si tous les segments ont été découpés.
            'clip_count'  : int  — Nombre de clips créés.
            'output_dir'  : str  — Chemin du dossier de sortie.
            'errors'      : list — Liste des erreurs rencontrées (segments ignorés).
    """
    result = {"success": False, "clip_count": 0, "output_dir": "", "errors": []}

    if not os.path.exists(audio_path):
        msg = f"[ERREUR] Fichier audio introuvable : {audio_path}"
        print(msg)
        result["errors"].append(msg)
        return result

    json_path = audio_path.replace(".wav", ".json")
    if not os.path.exists(json_path):
        msg = f"[ERREUR] JSON de métadonnées introuvable : {json_path}"
        print(msg)
        result["errors"].append(msg)
        return result

    # Chargement du JSON et récupération des segments
    with open(json_path, 'r', encoding='utf-8') as meta_file:
        metadata = json.load(meta_file)

    audio_id = metadata.get("source_id", os.path.splitext(os.path.basename(audio_path))[0])
    segments = metadata.get("transcription", {}).get("segments", [])

    if not segments:
        msg = f"[AVERTISSEMENT] Aucun segment trouvé dans {json_path}. Lancer d'abord transcriber.py."
        print(msg)
        result["errors"].append(msg)
        return result

    # Préparation du dossier de sortie
    if output_dir is None:
        output_dir = os.path.join(SEGMENTS_ROOT, audio_id)
    os.makedirs(output_dir, exist_ok=True)
    result["output_dir"] = output_dir

    print(f"[SPLIT] Découpage de {len(segments)} segments pour : {audio_path}")
    print(f"[SPLIT] Dossier de sortie : {output_dir}")

    clip_count = 0
    for seg in segments:
        seg_id   = seg.get("id", clip_count)
        start_s  = seg.get("start", 0.0)
        end_s    = seg.get("end",   0.0)
        duration = end_s - start_s

        if duration <= 0:
            result["errors"].append(f"Segment {seg_id} ignoré : durée invalide ({duration:.2f}s)")
            continue

        clip_filename = f"seg_{seg_id:04d}.wav"
        clip_path     = os.path.join(output_dir, clip_filename)

        # Découpage FFmpeg sans réencodage (stream copy) — très rapide
        # -ss : début du clip | -t : durée | -c copy : pas de réencodage | -y : écraser
        ffmpeg_cmd = [
            FFMPEG_EXE,
            "-y",                         # Écraser sans demander confirmation
            "-i",    audio_path,          # Fichier source
            "-ss",   str(start_s),        # Début
            "-t",    str(duration),       # Durée (plus précis que -to pour stream copy)
            "-c",    "copy",              # Copie directe, sans réencodage = instantané
            "-loglevel", "error",         # Supprimer la verbosité FFmpeg sauf erreurs
            clip_path
        ]

        try:
            proc = subprocess.run(
                ffmpeg_cmd,
                shell=False,              # SÉCURITÉ (AI_WORKFLOW_RULES §5) : pas de shell=True
                capture_output=True,
                text=True
            )
            if proc.returncode != 0:
                err = f"Segment {seg_id} : FFmpeg a retourné une erreur — {proc.stderr.strip()[:200]}"
                print(f"  [⚠] {err}")
                print(f"  [!] {err}")
                result["errors"].append(err)
                continue

            clip_count += 1
            # Log de progression tous les 50 segments pour ne pas saturer la console
            if clip_count % 50 == 0 or clip_count == len(segments):
                print(f"  [OK] {clip_count}/{len(segments)} clips crees...")

        except FileNotFoundError:
            msg = (f"[ERREUR CRITIQUE] FFmpeg introuvable a : {FFMPEG_EXE}\n"
                   "Definissez FFMPEG_PATH dans votre fichier .env.")
            print(msg)
            result["errors"].append(msg)
            break

    result["clip_count"] = clip_count
    result["success"] = clip_count > 0

    if result["success"]:
        print(f"\n[SUCCES] {clip_count} clips WAV crees dans : {output_dir}")
    else:
        print(f"\n[ECHEC] Aucun clip n'a ete cree. Verifiez les erreurs ci-dessus.")

    return result


def split_all_in_directory(raw_dir: str = "data/raw") -> None:
    """
    Découpe tous les fichiers WAV présents dans raw_dir qui ont un JSON associé.

    Utilisé pour le mode batch (traitement de toute une chaîne en une passe).

    Paramètres :
        raw_dir : Dossier contenant les .wav et .json de la collecte.
    """
    wav_files = glob.glob(os.path.join(raw_dir, "*.wav"))
    if not wav_files:
        print(f"[INFO] Aucun fichier WAV trouvé dans : {raw_dir}")
        return

    print(f"[BATCH] {len(wav_files)} fichier(s) WAV à découper.")
    total_clips = 0
    for wav_path in wav_files:
        print(f"\n{'='*60}")
        res = split_audio_from_json(wav_path)
        total_clips += res["clip_count"]

    print(f"\n{'='*60}")
    print(f"[BATCH] Terminé — {total_clips} clips créés au total.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Découpeur audio BantuVoice (FFmpeg stream copy)",
        epilog="Exemple : python audio_splitter.py --audio data/raw/O97sabwUu6Y.wav"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--audio", type=str,
                       help="Chemin vers un fichier .wav unique à découper")
    group.add_argument("--all",   action="store_true",
                       help="Découper tous les fichiers WAV de data/raw/")
    parser.add_argument("--output", type=str, default=None,
                        help="Dossier de sortie (défaut: data/segments/{audio_id}/)")

    args = parser.parse_args()

    if args.all:
        split_all_in_directory()
    else:
        split_audio_from_json(args.audio, args.output)
