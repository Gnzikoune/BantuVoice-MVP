"""
Serveur Backend BantuVoice (FastAPI).
Version 3.0 - Architecture Cloud-Native (Floci.io / AWS DynamoDB + S3)

Décision architecturale (AI_WORKFLOW_RULES §6) :
- TinyDB remplacé par Amazon DynamoDB (via Floci.io local) pour la scalabilité (jusqu'à 10 000+ audios).
- Les fichiers audios sont stockés dans Amazon S3 (via Floci.io local) au lieu du disque brut.
- En production, il suffira de changer AWS_ENDPOINT_URL pour pointer vers le vrai AWS.
"""

import os
import json
import asyncio
import glob
from datetime import datetime, timedelta
from typing import List, Optional
from decimal import Decimal

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import jwt
import bcrypt
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION SÉCURITÉ (AI_WORKFLOW_RULES §5) ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_secret_for_dev_only")
DEFAULT_PASSWORD = os.getenv("DEFAULT_TEST_PASSWORD", "password123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 jour

# --- CONFIGURATION AWS LOCAL (Floci.io) ---
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
AWS_REGION = os.getenv("AWS_REGION", "eu-west-3")
S3_BUCKET = "bantuvoice-audios"

# Les langues sont désormais gérées dynamiquement via DynamoDB (Table 'Languages').
# SUPPORTED_LANGUAGES a été retiré.

def get_dynamodb():
    """Retourne un client DynamoDB connecté à Floci (ou au vrai AWS en prod)."""
    return boto3.resource(
        'dynamodb',
        endpoint_url=AWS_ENDPOINT_URL,
        region_name=AWS_REGION,
        aws_access_key_id="test",
        aws_secret_access_key="test"
    )

def get_s3():
    """Retourne un client S3 connecté à Floci (ou au vrai AWS en prod)."""
    return boto3.client(
        's3',
        endpoint_url=AWS_ENDPOINT_URL,
        region_name=AWS_REGION,
        aws_access_key_id="test",
        aws_secret_access_key="test"
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_password_hash(password: str) -> str:
    """Hash un mot de passe via Bcrypt (sans Passlib pour éviter les conflits de versions)."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe Bcrypt."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# --- INITIALISATION BASE DE DONNÉES (DynamoDB) ---
def init_db():
    """
    Initialise les comptes utilisateurs dans DynamoDB si absents.
    Appelé au démarrage du serveur.
    """
    dynamodb = get_dynamodb()
    users_table = dynamodb.Table('Users')

    default_users = [
        {"username": "gildas_admin", "full_name": "Gildas (Admin)", "role": "admin"},
        {"username": "linguiste_a",  "full_name": "Linguiste A",    "role": "linguist"},
        {"username": "linguiste_b",  "full_name": "Linguiste B",    "role": "linguist"},
    ]

    for u in default_users:
        if 'Item' not in users_table.get_item(Key={"username": u["username"]}):
            u["hashed_password"] = get_password_hash(DEFAULT_PASSWORD)
            users_table.put_item(Item=u)
            print(f"Utilisateur {u['username']} créé avec le mot de passe par défaut.")

    # Seed initial des langues
    lang_table = dynamodb.Table('Languages')
    if lang_table.scan()['Count'] == 0:
        default_langs = [
            {"code": "fang", "label": "Fang"},
            {"code": "punu", "label": "Punu"},
            {"code": "nzebi", "label": "Nzebi"},
            {"code": "myene", "label": "Myene"},
            {"code": "teke", "label": "Teke"},
            {"code": "obamba", "label": "Obamba"},
            {"code": "kota", "label": "Kota"}
        ]
        for lang in default_langs:
            lang_table.put_item(Item=lang)
        print("Langues par défaut insérées.")

try:
    init_db()
except Exception as e:
    print(f"[AVERTISSEMENT] Impossible de connecter à Floci/DynamoDB au démarrage: {e}")
    print("[AVERTISSEMENT] Vérifiez que le conteneur Docker 'bantuvoice-floci' est en cours d'exécution.")

# --- TRACKING DE TÂCHE ADMIN ---
admin_task_status = {
    "is_running": False, "step": "", "progress": 0, "message": ""
}

# --- INITIALISATION API ---
app = FastAPI(title="BantuVoice Annotation API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODÈLES PYDANTIC ---
class Token(BaseModel):
    access_token: str
    token_type: str

class AnnotationPayload(BaseModel):
    audio_id: str
    segment_id: str
    annotated_text: str

class AdminCollectPayload(BaseModel):
    url: str
    language: str  # Code de la langue (ex: "fang")

# --- FONCTIONS SÉCURITÉ ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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

    dynamodb = get_dynamodb()
    try:
        response = dynamodb.Table('Users').get_item(Key={"username": username})
        user = response.get("Item")
    except Exception:
        raise credentials_exception

    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: dict = Depends(get_current_user)):
    """Décorateur de sécurité : refuse l'accès si l'utilisateur n'est pas admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Privilèges d'administrateur requis")
    return current_user

# =============================================================================
# ROUTES API
# =============================================================================

@app.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    dynamodb = get_dynamodb()
    try:
        response = dynamodb.Table('Users').get_item(Key={"username": form_data.username})
        user = response.get("Item")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur DB: {str(e)}")

    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user['username'], "full_name": user['full_name'], "role": user.get('role', 'linguist')},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "full_name": current_user["full_name"],
        "role": current_user.get("role", "linguist")
    }

@app.get("/languages")
def get_languages():
    """Retourne la liste des langues gabonaises depuis DynamoDB."""
    dynamodb = get_dynamodb()
    try:
        response = dynamodb.Table('Languages').scan()
        languages = response.get('Items', [])
        # Trier par label
        languages.sort(key=lambda x: x['label'])
        return {"languages": languages}
    except Exception as e:
        return {"languages": []}

@app.get("/audios")
def get_audios(language: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """
    Retourne la liste des audios disponibles, optionnellement filtrés par langue.
    Utilisé par le linguiste pour choisir sur quel audio travailler.
    """
    dynamodb = get_dynamodb()
    try:
        if language:
            response = dynamodb.Table('Audios').scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('language').eq(language)
            )
        else:
            response = dynamodb.Table('Audios').scan()
        audios = response.get('Items', [])
        # Conversion des Decimal en int/float pour la sérialisation JSON
        for a in audios:
            if 'segment_count' in a:
                a['segment_count'] = int(a['segment_count'])
        return {"audios": audios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la lecture des audios: {str(e)}")

@app.get("/segments")
def get_segments_to_annotate(audio_id: str, current_user: dict = Depends(get_current_user)):
    """
    Renvoie les segments d'un audio spécifique.
    Logique d'aveuglement : le linguiste ne voit que son propre statut d'annotation.
    """
    dynamodb = get_dynamodb()
    try:
        response = dynamodb.Table('Segments').query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('audio_id').eq(audio_id)
        )
        raw_segments = response.get('Items', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur DB: {str(e)}")

    segments = []
    for seg in raw_segments:
        # Conversion des types Decimal
        seg['start'] = float(seg.get('start', 0))
        seg['end'] = float(seg.get('end', 0))
        seg['total_annotations'] = int(seg.get('total_annotations', 0))

        # Aveuglement : on expose uniquement l'annotation de l'utilisateur connecté
        annotations = seg.get('annotations', {})
        my_annotation = annotations.get(current_user['username'], "")
        seg['annotated_text'] = my_annotation
        seg['status'] = "annotated" if my_annotation else "pending"
        del seg['annotations']
        segments.append(seg)

    return {"segments": segments}

@app.get("/audio/{audio_id}")
def stream_audio(audio_id: str, current_user: dict = Depends(get_current_user)):
    """Sert un fichier audio depuis S3 (Floci) en streaming."""
    s3 = get_s3()
    try:
        obj = s3.get_object(Bucket=S3_BUCKET, Key=f"audios/{audio_id}.wav")
        return StreamingResponse(obj['Body'], media_type="audio/wav")
    except ClientError:
        raise HTTPException(status_code=404, detail="Fichier audio introuvable dans S3.")

@app.post("/annotate")
def save_annotation(payload: AnnotationPayload, current_user: dict = Depends(get_current_user)):
    """
    Sauvegarde l'annotation du linguiste connecté dans DynamoDB.
    Utilise une map d'annotations par annotateur pour implémenter le protocole d'aveuglement.
    """
    dynamodb = get_dynamodb()
    try:
        dynamodb.Table('Segments').update_item(
            Key={"audio_id": payload.audio_id, "segment_id": payload.segment_id},
            UpdateExpression="SET annotations.#ann = :text, total_annotations = total_annotations + :inc",
            ExpressionAttributeNames={"#ann": current_user['username']},
            ExpressionAttributeValues={
                ":text": payload.annotated_text,
                ":inc": Decimal('1') if not _has_annotation(dynamodb, payload.audio_id, payload.segment_id, current_user['username']) else Decimal('0')
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de sauvegarde: {str(e)}")

    return {"status": "success", "message": "Annotation sauvegardée dans DynamoDB."}

def _has_annotation(dynamodb, audio_id: str, segment_id: str, username: str) -> bool:
    """Vérifie si un annotateur a déjà annoté un segment (pour la gestion du compteur)."""
    try:
        response = dynamodb.Table('Segments').get_item(Key={"audio_id": audio_id, "segment_id": segment_id})
        item = response.get("Item", {})
        return username in item.get("annotations", {})
    except Exception:
        return False

# =============================================================================
# ROUTES ADMIN
# =============================================================================

@app.get("/admin/languages")
def admin_get_languages(current_user: dict = Depends(require_admin)):
    """Retourne la liste des langues pour le formulaire d'administration depuis DynamoDB."""
    dynamodb = get_dynamodb()
    try:
        response = dynamodb.Table('Languages').scan()
        languages = response.get('Items', [])
        languages.sort(key=lambda x: x['label'])
        return {"languages": languages}
    except Exception:
        return {"languages": []}

@app.get("/admin/audios")
def admin_get_audios(current_user: dict = Depends(require_admin)):
    """Tableau de bord admin : liste tous les audios dans la bibliothèque."""
    dynamodb = get_dynamodb()
    try:
        response = dynamodb.Table('Audios').scan()
        audios = response.get('Items', [])
        for a in audios:
            if 'segment_count' in a:
                a['segment_count'] = int(a['segment_count'])
        return {"audios": audios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/collect")
async def admin_collect(payload: AdminCollectPayload, current_user: dict = Depends(require_admin)):
    """
    Lance une collecte en arrière-plan pour une URL YouTube.
    Requiert désormais la langue de l'audio pour cataloguer correctement dans la bibliothèque.
    """
    if admin_task_status["is_running"]:
        raise HTTPException(status_code=400, detail="Une tâche est déjà en cours.")

    # Validation de la langue depuis DynamoDB
    dynamodb = get_dynamodb()
    try:
        lang_response = dynamodb.Table('Languages').scan()
        valid_codes = [item['code'] for item in lang_response.get('Items', [])]
    except Exception:
        valid_codes = []
    
    if payload.language not in valid_codes:
        raise HTTPException(status_code=400, detail=f"Langue invalide. Codes valides: {valid_codes}")

    admin_task_status.update({
        "is_running": True,
        "step": "Étape 1 : Téléchargement audio",
        "progress": 10,
        "message": f"Aspiration de '{payload.url}' via yt-dlp (langue: {payload.language})..."
    })

    asyncio.create_task(run_collection_pipeline(payload.url, payload.language))
    return {"message": "Collecte lancée en arrière-plan"}

@app.get("/admin/status")
def admin_status(current_user: dict = Depends(require_admin)):
    return admin_task_status

async def run_collection_pipeline(url: str, language: str):
    """
    Pipeline de collecte asynchrone en arrière-plan :
    1. Téléchargement via yt-dlp
    2. Segmentation IA via Whisper
    3. Upload S3 + insertion DynamoDB
    """
    try:
        import subprocess
        # Étape 1 : Téléchargement
        await asyncio.to_thread(
            subprocess.run,
            f"venv\\Scripts\\python.exe src/collecte/downloader.py --url \"{url}\"",
            shell=True, check=True
        )

        # Étape 2 : Transcription/Segmentation
        admin_task_status.update({
            "step": "Étape 2 : Segmentation IA (Whisper)",
            "progress": 50,
            "message": "Analyse temporelle et découpage en segments..."
        })

        wav_files = glob.glob("data/raw/*.wav")
        for wav in wav_files:
            # 1. Mise à jour de l'UI pour informer l'utilisateur de ce qui se passe sous le capot
            admin_task_status.update({
                "message": f"Chargement du modèle Whisper 'base' en mémoire...\nTranscription en cours pour : {wav}"
            })
            
            # 2. Exécution asynchrone sécurisée du transcripteur
            await asyncio.to_thread(
                subprocess.run,
                f"venv\\Scripts\\python.exe src/transcription/transcriber.py --audio \"{wav}\"",
                shell=True, check=True
            )
            
            # 3. Notification de succès pour ce fichier spécifique
            json_path = wav.replace('.wav', '.json')
            if os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    segments = data.get("transcription", {}).get("segments", [])
                    duration = segments[-1]["end"] if segments else 0
                    msg = f"[SUCCÈS] {os.path.basename(wav)}: {len(segments)} segments, {duration:.1f}s."
            else:
                msg = f"[SUCCÈS] Transcription terminée pour {os.path.basename(wav)}"
            
            admin_task_status.update({"message": msg})
            # Petite pause pour que le message soit lisible sur le frontend
            await asyncio.sleep(1)

        # Étape 3 : Upload vers S3 + Enregistrement DynamoDB
        admin_task_status.update({
            "step": "Étape 3 : Enregistrement dans la bibliothèque",
            "progress": 80,
            "message": "Upload S3 et indexation dans la base de données..."
        })

        json_files = glob.glob("data/raw/*.json")
        dynamodb = get_dynamodb()
        s3 = get_s3()

        for json_path in json_files:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            audio_id = data.get("source_id", os.path.basename(json_path).replace(".json", ""))
            transcription = data.get("transcription", {})
            segments = transcription.get("segments", [])

            # Upload du WAV vers S3
            wav_path = json_path.replace(".json", ".wav")
            if os.path.exists(wav_path):
                with open(wav_path, 'rb') as wav_f:
                    s3.put_object(Bucket=S3_BUCKET, Key=f"audios/{audio_id}.wav", Body=wav_f.read())

            # Enregistrement de l'audio dans DynamoDB (table Audios)
            dynamodb.Table('Audios').put_item(Item={
                "audio_id": audio_id,
                "language": language,
                "source_url": url,
                "segment_count": Decimal(str(len(segments))),
                "created_at": datetime.utcnow().isoformat(),
                "title": data.get("title", audio_id)
            })

            # Enregistrement de chaque segment dans DynamoDB (table Segments)
            for seg in segments:
                dynamodb.Table('Segments').put_item(Item={
                    "audio_id": audio_id,
                    "segment_id": str(seg["id"]),
                    "start": Decimal(str(seg["start"])),
                    "end": Decimal(str(seg["end"])),
                    "whisper_text": seg.get("text", ""),
                    "annotations": {},
                    "total_annotations": Decimal('0')
                })

        admin_task_status.update({
            "step": "✅ Terminé",
            "progress": 100,
            "message": f"Audio en langue '{language}' traité et disponible dans la bibliothèque."
        })

    except Exception as e:
        import traceback
        err_msg = str(e) or traceback.format_exc()
        print("ERREUR CRITIQUE:", traceback.format_exc())
        admin_task_status.update({
            "step": "❌ Erreur",
            "message": f"Échec critique: {err_msg}",
            "progress": 0
        })
    finally:
        await asyncio.sleep(5)
        admin_task_status["is_running"] = False

@app.delete("/admin/audios/{audio_id}")
def delete_audio(audio_id: str, current_user: dict = Depends(get_current_user)):
    """Supprime un audio, tous ses segments associés, et le fichier S3."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé. Rôle administrateur requis.")
    
    dynamodb = get_dynamodb()
    s3 = get_s3()
    
    try:
        # 1. Supprimer l'audio de la table Audios
        dynamodb.Table('Audios').delete_item(Key={'audio_id': audio_id})
        
        # 2. Supprimer tous les segments associés
        response = dynamodb.Table('Segments').query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('audio_id').eq(audio_id)
        )
        for segment in response.get('Items', []):
            dynamodb.Table('Segments').delete_item(
                Key={'audio_id': audio_id, 'segment_id': segment['segment_id']}
            )
            
        # 3. Supprimer le fichier de S3
        try:
            s3.delete_object(Bucket=S3_BUCKET, Key=f"audios/{audio_id}.wav")
        except Exception as e:
            print(f"Erreur lors de la suppression S3 pour {audio_id}: {e}")
            
        return {"status": "success", "message": f"Audio {audio_id} et ses segments ont été supprimés."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

@app.post("/admin/languages")
def add_language(data: dict, current_user: dict = Depends(get_current_user)):
    """Ajoute une nouvelle langue (admin uniquement)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé.")
    code = data.get("code")
    label = data.get("label")
    if not code or not label:
        raise HTTPException(status_code=400, detail="code et label requis.")
    
    dynamodb = get_dynamodb()
    dynamodb.Table('Languages').put_item(Item={"code": code.lower(), "label": label})
    return {"status": "success", "message": "Langue ajoutée."}

@app.delete("/admin/languages/{code}")
def delete_language(code: str, current_user: dict = Depends(get_current_user)):
    """Supprime une langue."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé.")
    dynamodb = get_dynamodb()
    dynamodb.Table('Languages').delete_item(Key={'code': code})
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
