"""
Module de segmentation temporelle par IA (Étape 02 du pipeline BantuVoice).

Décision architecturale (RESEARCH_LOG Entrée 16) :
- Migration de 'openai-whisper' (vanilla) vers 'faster-whisper' (CTranslate2).
- Raison : 4× plus rapide sur CPU, 2× moins de RAM, même qualité de segmentation.
- Sur la machine de dev (i5-1235U, 16 Go RAM, sans CUDA dédié) : compute_type='int8'
  sur device='cpu' est le mode optimal.

Rôle dans le pipeline :
  data/raw/audio.wav  →  transcription Whisper  →  data/raw/audio.json (mis à jour)
  Le découpage en clips individuels est délégué à audio_splitter.py.
"""

import os
import json
import argparse

from dotenv import load_dotenv
load_dotenv()

# SÉCURITÉ (AI_WORKFLOW_RULES §5) : Le chemin FFmpeg est lu depuis les variables d'environnement.
# Définissez FFMPEG_PATH dans votre fichier .env si ffmpeg n'est pas dans le PATH système.
ffmpeg_path = os.getenv(
    "FFMPEG_PATH",
    r"C:\Users\hp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
)
if os.path.exists(ffmpeg_path) and ffmpeg_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] += os.pathsep + ffmpeg_path


def transcribe_and_update_json(
    audio_path: str,
    model_size: str = "small",
    language: str = None,
    device: str = "cpu",
    compute_type: str = "int8"
) -> bool:
    """
    Segmente un fichier audio via faster-whisper et enrichit le JSON de métadonnées.

    Paramètres :
        audio_path   : Chemin absolu ou relatif vers le fichier .wav à traiter.
        model_size   : Taille du modèle Whisper ('tiny', 'base', 'small', 'medium').
                       Recommandé pour la machine de dev : 'small'.
        language     : Code ISO de langue optionnel pour forcer la détection (ex: 'fr').
                       Pour les langues gabonaises, laisser None (détection automatique).
        device       : 'cpu' ou 'cuda'. Sur MX570 sans CUDA configuré, utiliser 'cpu'.
        compute_type : 'int8' sur CPU (optimal), 'float16' sur GPU CUDA.

    Retourne :
        True si le JSON a été mis à jour avec succès, False en cas d'erreur.
    """
    if not os.path.exists(audio_path):
        print(f"[ERREUR] Le fichier audio est introuvable : {audio_path}")
        return False

    json_path = audio_path.replace(".wav", ".json")
    if not os.path.exists(json_path):
        print(f"[ERREUR] Fichier de métadonnées JSON introuvable : {json_path}")
        return False

    # Import ici pour isoler la dépendance et faciliter les tests unitaires futurs
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("[ERREUR] faster-whisper non installé. Lancer : pip install faster-whisper")
        return False

    print(f"[INIT] Chargement du modèle faster-whisper '{model_size}' sur {device} ({compute_type})...")
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
    except Exception as model_err:
        print(f"[ERREUR] Impossible de charger le modèle : {model_err}")
        return False

    print(f"[SEGMENTATION] Traitement en cours : {audio_path}")
    try:
        # Options de transcription. beam_size=5 est le défaut de Whisper pour la qualité.
        # vad_filter=True active le Voice Activity Detection intégré pour ignorer les silences.
        transcribe_kwargs = {
            "beam_size": 5,
            "word_timestamps": True,   # Timestamps au niveau du MOT (bonus scientifique)
            "vad_filter": True,        # Ignore les segments de silence — réduit les hallucinations
            "vad_parameters": {"min_silence_duration_ms": 500},
        }
        if language:
            transcribe_kwargs["language"] = language

        segments_generator, transcription_info = model.transcribe(audio_path, **transcribe_kwargs)

        # faster-whisper retourne un générateur — on le matérialise en liste
        raw_segments = list(segments_generator)

        print(f"[INFO] Langue détectée : {transcription_info.language} "
              f"(probabilité : {transcription_info.language_probability:.2%})")
        print(f"[INFO] {len(raw_segments)} segment(s) détecté(s) sur "
              f"{transcription_info.duration:.1f}s d'audio.")

        # Construction du JSON de sortie — format identique à l'ancienne version
        # pour garantir la compatibilité avec server.py et audio_splitter.py.
        transcription_data = {
            "model_used": f"faster-whisper-{model_size}",
            "detected_language": transcription_info.language,
            "language_probability": round(transcription_info.language_probability, 4),
            "full_text": " ".join(seg.text.strip() for seg in raw_segments),
            "segments": []
        }

        for seg in raw_segments:
            segment_entry = {
                "id": seg.id,
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "no_speech_prob": round(seg.no_speech_prob, 4),
            }
            # Ajout optionnel des timestamps par mot (utilisés par l'interface d'annotation future)
            if seg.words:
                segment_entry["words"] = [
                    {"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
                    for w in seg.words
                ]
            transcription_data["segments"].append(segment_entry)

        # Mise à jour du fichier JSON de métadonnées
        with open(json_path, 'r', encoding='utf-8') as meta_file:
            metadata = json.load(meta_file)

        metadata["transcription"] = transcription_data

        with open(json_path, 'w', encoding='utf-8') as meta_file:
            json.dump(metadata, meta_file, ensure_ascii=False, indent=4)

        print(f"[SUCCÈS] JSON mis à jour : {json_path}")
        print(f"[SUCCÈS] {len(raw_segments)} segments prêts pour le découpage audio.")
        return True

    except Exception as transcription_err:
        print(f"[ERREUR] Échec lors de la segmentation : {transcription_err}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pipeline de Segmentation IA BantuVoice (faster-whisper)",
        epilog="Exemple : python transcriber.py --audio data/raw/audio.wav --model small"
    )
    parser.add_argument("--audio",   type=str, required=True,
                        help="Chemin vers le fichier .wav à segmenter")
    parser.add_argument("--model",   type=str, default="small",
                        choices=["tiny", "base", "small", "medium"],
                        help="Taille du modèle (défaut: small)")
    parser.add_argument("--language", type=str, default=None,
                        help="Forcer la langue (ex: 'fr' pour l'alphabet francophone)")
    parser.add_argument("--device",  type=str, default="cpu",
                        choices=["cpu", "cuda"],
                        help="Dispositif d'inférence (défaut: cpu)")
    parser.add_argument("--compute-type", type=str, default="int8",
                        dest="compute_type",
                        choices=["int8", "float16", "float32"],
                        help="Précision de calcul (défaut: int8 — optimal sur CPU)")

    args = parser.parse_args()
    transcribe_and_update_json(
        audio_path=args.audio,
        model_size=args.model,
        language=args.language,
        device=args.device,
        compute_type=args.compute_type
    )
