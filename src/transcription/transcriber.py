"""
Module de transcription automatique par IA (Étape 02).

Ce module utilise OpenAI Whisper pour transcrire les fichiers audio (.wav) 
collectés à l'étape 1 en texte brut.
"""

import os
import argparse
import whisper

def transcribe_audio(audio_path: str, model_size: str = "base") -> str:
    """
    Charge le modèle Whisper et génère la transcription brute d'un fichier audio.
    
    Args:
        audio_path (str): Chemin vers le fichier WAV.
        model_size (str): Taille du modèle Whisper ('tiny', 'base', 'small', 'medium', 'large-v3').
                          Pour l'architecture locale (CPU), 'base' ou 'small' est recommandé.
                          Pour le serveur de production, 'large-v3' sera imposé.
                          
    Returns:
        str: Le texte transcrit brut.
    """
    if not os.path.exists(audio_path):
        print(f"[ERREUR] Le fichier audio est introuvable : {audio_path}")
        return ""
    
    print(f"Chargement du modèle Whisper '{model_size}' en mémoire... (cela peut prendre quelques secondes)")
    try:
        # Chargement du modèle. Le paramètre 'download_root' permet de centraliser les modèles si on veut.
        model = whisper.load_model(model_size)
    except Exception as e:
        print(f"[ERREUR] Impossible de charger le modèle Whisper : {e}")
        return ""
        
    print(f"Transcription en cours pour le fichier : {audio_path}")
    try:
        # Transcrit l'audio. On ne force pas encore la langue (ce sera l'Étape 4)
        result = model.transcribe(audio_path)
        return result["text"].strip()
    except Exception as e:
        print(f"[ERREUR] Échec lors de la transcription de {audio_path} : {e}")
        return ""

if __name__ == "__main__":
    # Interface CLI pour tester la transcription indépendamment
    parser = argparse.ArgumentParser(description="Pipeline de Transcription BantuVoice (Whisper)")
    
    parser.add_argument("--audio", type=str, required=True, help="Chemin vers le fichier .wav à transcrire")
    parser.add_argument("--model", type=str, default="base", help="Taille du modèle (base, small, large-v3...)")
    
    args = parser.parse_args()
    
    texte_brut = transcribe_audio(args.audio, args.model)
    
    if texte_brut:
        print("\n=== RÉSULTAT DE LA TRANSCRIPTION ===")
        print(texte_brut)
        print("====================================")
