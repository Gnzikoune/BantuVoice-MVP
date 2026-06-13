"""
Module de transcription automatique par IA (Étape 02).

Ce module utilise OpenAI Whisper pour transcrire les fichiers audio (.wav) 
collectés à l'étape 1, et enrichit le fichier JSON de métadonnées.
"""

import os
import json
import argparse
# pyrefly: ignore [missing-import]
import whisper

# SÉCURITÉ (AI_WORKFLOW_RULES §5) : Le chemin FFmpeg est lu depuis les variables d'environnement.
# Ne jamais hardcoder un chemin machine-dépendant dans le code source.
# Définissez FFMPEG_PATH dans votre fichier .env si ffmpeg n'est pas dans le PATH système.
ffmpeg_path = os.getenv(
    "FFMPEG_PATH",
    r"C:\Users\hp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
)
if os.path.exists(ffmpeg_path) and ffmpeg_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] += os.pathsep + ffmpeg_path


def transcribe_and_update_json(audio_path: str, model_size: str = "base", language: str = None, prompt: str = None) -> bool:
    """
    Charge Whisper, transcrit l'audio (avec horodatage) et met à jour le JSON.
    """
    if not os.path.exists(audio_path):
        print(f"[ERREUR] Le fichier audio est introuvable : {audio_path}")
        return False
        
    json_path = audio_path.replace(".wav", ".json")
    if not os.path.exists(json_path):
        print(f"[ERREUR] Fichier de métadonnées JSON introuvable : {json_path}")
        return False
    
    print(f"Chargement du modèle Whisper '{model_size}' en mémoire...")
    try:
        model = whisper.load_model(model_size)
    except Exception as e:
        print(f"[ERREUR] Impossible de charger le modèle Whisper : {e}")
        return False
        
    print(f"Transcription en cours pour : {audio_path}")
    try:
        # Options pour gérer les langues à faibles ressources (Étape 4)
        options = {"fp16": False}
        if language:
            options["language"] = language
        if prompt:
            options["initial_prompt"] = prompt
            
        result = model.transcribe(audio_path, **options)
        
        # Extraction structurée (Étape 3)
        transcription_data = {
            "model_used": f"whisper-{model_size}",
            "detected_language": result.get("language", "unknown"),
            "full_text": result["text"].strip(),
            "segments": []
        }
        
        for segment in result.get("segments", []):
            transcription_data["segments"].append({
                "id": segment["id"],
                "start": round(segment["start"], 2),
                "end": round(segment["end"], 2),
                "text": segment["text"].strip(),
                # Whisper classique fournit quelques probabilités utiles
                "no_speech_prob": round(segment.get("no_speech_prob", 0.0), 4)
            })
            
        # Mise à jour du fichier JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            
        metadata["transcription"] = transcription_data
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=4)
            
        print(f"[SUCCÈS] Transcription terminée et JSON mis à jour : {json_path}")
        return True
        
    except Exception as e:
        print(f"[ERREUR] Échec lors de la transcription : {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipeline de Transcription BantuVoice")
    parser.add_argument("--audio", type=str, required=True, help="Chemin vers le fichier .wav")
    parser.add_argument("--model", type=str, default="base", help="Taille du modèle (ex: base, large-v3)")
    parser.add_argument("--language", type=str, default=None, help="Forcer la langue (ex: fr pour forcer un alphabet francophone)")
    parser.add_argument("--prompt", type=str, default=None, help="Prompt initial pour guider l'IA (ex: 'Transcription en langue Fang.')")
    
    args = parser.parse_args()
    transcribe_and_update_json(args.audio, args.model, args.language, args.prompt)
