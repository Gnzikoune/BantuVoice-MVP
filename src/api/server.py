"""
Serveur Backend BantuVoice (FastAPI).
Version 2.0 - Sécurisée (JWT) et Base de Données (TinyDB)
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import jwt
from passlib.context import CryptContext
from tinydb import TinyDB, Query

# --- CONFIGURATION SÉCURITÉ ---
# Dans un projet en production, cette clé doit être dans un fichier .env (cf. AI_WORKFLOW_RULES)
# Pour ce MVP local, nous la définissons ici.
SECRET_KEY = "bantuvoice_csgria_secret_key_super_secure"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 jour

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- INITIALISATION BASE DE DONNÉES ---
DB_DIR = "data/db"
DATA_DIR = "data/raw"
os.makedirs(DB_DIR, exist_ok=True)

db = TinyDB(os.path.join(DB_DIR, 'database.json'))
users_table = db.table('users')
annotations_table = db.table('annotations')

# Fonction utilitaire pour créer des utilisateurs de test si la table est vide
def init_db():
    if len(users_table) == 0:
        print("Initialisation de la base de données : création des comptes de test...")
        users_table.insert({
            "username": "linguiste_a",
            "full_name": "Linguiste A (Fang)",
            "hashed_password": pwd_context.hash("password123")
        })
        users_table.insert({
            "username": "linguiste_b",
            "full_name": "Linguiste B (Fang)",
            "hashed_password": pwd_context.hash("password123")
        })

init_db()

# --- INITIALISATION API ---
app = FastAPI(title="BantuVoice Annotation API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists(DATA_DIR):
    app.mount("/audio", StaticFiles(directory=DATA_DIR), name="audio")

# --- MODÈLES PYDANTIC ---
class Token(BaseModel):
    access_token: str
    token_type: str

class AnnotationPayload(BaseModel):
    video_id: str
    segment_id: int
    annotated_text: str

# --- FONCTIONS SÉCURITÉ ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    UserQuery = Query()
    user = users_table.get(UserQuery.username == username)
    if user is None:
        raise credentials_exception
    return user

# --- ROUTES API ---

@app.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    UserQuery = Query()
    user = users_table.get(UserQuery.username == form_data.username)
    
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['username'], "full_name": user['full_name']},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "full_name": current_user["full_name"]}

@app.get("/segments")
def get_segments_to_annotate(current_user: dict = Depends(get_current_user)):
    """
    Renvoie les segments disponibles. 
    Logique d'aveuglement : le linguiste ne voit que son propre statut d'annotation.
    """
    if not os.path.exists(DATA_DIR):
        return {"segments": []}
        
    all_segments = []
    AnnotationQuery = Query()
    
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
                    # On cherche si L'UTILISATEUR ACTUEL a déjà annoté ce segment dans TinyDB
                    my_annotation = annotations_table.get(
                        (AnnotationQuery.video_id == video_id) & 
                        (AnnotationQuery.segment_id == seg["id"]) & 
                        (AnnotationQuery.annotator == current_user["username"])
                    )
                    
                    # On compte le nombre total d'annotations sur ce segment (pour savoir si c'est doublement annoté)
                    all_anns_for_seg = annotations_table.search(
                        (AnnotationQuery.video_id == video_id) & 
                        (AnnotationQuery.segment_id == seg["id"])
                    )
                    total_annotations = len(all_anns_for_seg)
                    
                    seg_info = {
                        "video_id": video_id,
                        "audio_path": audio_path,
                        "segment_id": seg["id"],
                        "start": seg["start"],
                        "end": seg["end"],
                        "whisper_text": seg["text"], 
                        "annotated_text": my_annotation["text"] if my_annotation else "",
                        "status": "annotated" if my_annotation else "pending",
                        "total_annotations": total_annotations # Permet au web d'afficher si c'est en cours de double annotation
                    }
                    all_segments.append(seg_info)
            except Exception as e:
                print(f"Erreur lors de la lecture de {filename} : {e}")
                continue
                
    return {"segments": all_segments}

@app.post("/annotate")
def save_annotation(payload: AnnotationPayload, current_user: dict = Depends(get_current_user)):
    """
    Sauvegarde l'annotation du linguiste connecté dans la base de données TinyDB (et non plus dans le JSON).
    """
    AnnotationQuery = Query()
    
    # On vérifie si l'utilisateur a déjà annoté ce segment
    existing = annotations_table.get(
        (AnnotationQuery.video_id == payload.video_id) & 
        (AnnotationQuery.segment_id == payload.segment_id) & 
        (AnnotationQuery.annotator == current_user["username"])
    )
    
    if existing:
        # Mise à jour
        annotations_table.update(
            {"text": payload.annotated_text, "timestamp": str(datetime.utcnow())},
            doc_ids=[existing.doc_id]
        )
    else:
        # Nouvelle insertion
        annotations_table.insert({
            "video_id": payload.video_id,
            "segment_id": payload.segment_id,
            "annotator": current_user["username"],
            "text": payload.annotated_text,
            "timestamp": str(datetime.utcnow())
        })
        
    return {"status": "success", "message": "Annotation sauvegardée en base de données de manière sécurisée."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
