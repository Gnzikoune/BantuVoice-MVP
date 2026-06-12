"""
Serveur Backend BantuVoice (FastAPI).

Ce serveur sert d'API pour la plateforme Web d'annotation (React).
Il lit les données générées par Whisper (segments) et permet
aux annotateurs de sauvegarder leurs corrections.
"""

import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List

app = FastAPI(title="BantuVoice Annotation API", version="1.0")

# Permettre à l'application React (qui tournera sur un autre port) de communiquer avec l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En MVP on autorise tout. En prod on mettra l'URL exacte du frontend.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "data/raw"
# Permet au web de lire les fichiers audio (ex: http://localhost:8000/audio/XYZ.wav)
if os.path.exists(DATA_DIR):
    app.mount("/audio", StaticFiles(directory=DATA_DIR), name="audio")

class AnnotationPayload(BaseModel):
    video_id: str
    segment_id: int
    annotated_text: str
    annotator_name: str

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API BantuVoice"}

@app.get("/segments")
def get_segments_to_annotate():
    """
    Parcourt le dossier data/raw, lit tous les fichiers JSON, 
    et renvoie une liste de segments audio disponibles pour l'annotation.
    """
    if not os.path.exists(DATA_DIR):
        return {"segments": []}
        
    all_segments = []
    
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(DATA_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                video_id = data.get("source_id")
                audio_path = data.get("audio_path")
                transcription = data.get("transcription", {})
                
                for seg in transcription.get("segments", []):
                    # On enrichit chaque segment avec les infos de la vidéo parente
                    # pour que le Frontend sache exactement quel fichier jouer
                    seg_info = {
                        "video_id": video_id,
                        "audio_path": audio_path,
                        "segment_id": seg["id"],
                        "start": seg["start"],
                        "end": seg["end"],
                        "whisper_text": seg["text"], # Le texte "halluciné" (optionnel à afficher)
                        "annotated_text": seg.get("annotated_text", ""), # Vide si pas encore annoté
                        "status": "annotated" if "annotated_text" in seg else "pending"
                    }
                    all_segments.append(seg_info)
            except Exception as e:
                print(f"Erreur lors de la lecture de {filename} : {e}")
                continue
                
    return {"segments": all_segments}

@app.post("/annotate")
def save_annotation(payload: AnnotationPayload):
    """
    Reçoit le texte tapé par l'annotateur humain depuis le Web,
    et le sauvegarde définitivement dans le fichier JSON.
    """
    json_path = os.path.join(DATA_DIR, f"{payload.video_id}.json")
    
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Fichier JSON source introuvable")
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Recherche du segment exact dans le JSON
    segment_found = False
    for seg in data.get("transcription", {}).get("segments", []):
        if seg["id"] == payload.segment_id:
            seg["annotated_text"] = payload.annotated_text
            seg["annotator"] = payload.annotator_name
            segment_found = True
            break
            
    if not segment_found:
        raise HTTPException(status_code=404, detail="Segment introuvable dans le fichier")
        
    # On sauvegarde sur le disque
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
    return {"status": "success", "message": "Annotation sauvegardée avec succès !"}

# Si on lance ce fichier directement (python src/api/server.py)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
