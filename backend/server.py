from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, TEXT
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import shutil
from pathlib import Path
import json

# Configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/p2p_share_app")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# FastAPI app
app = FastAPI(title="P2P Share App - Suisse", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
client = AsyncIOMotorClient(MONGO_URL)
db = client.p2p_share_app

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Swiss cantons for location filtering
SWISS_CANTONS = [
    "Aargau", "Appenzell Innerrhoden", "Appenzell Ausserrhoden", "Bern",
    "Basel-Landschaft", "Basel-Stadt", "Fribourg", "Genève", "Glarus",
    "Graubünden", "Jura", "Luzern", "Neuchâtel", "Nidwalden", "Obwalden",
    "Schaffhausen", "Solothurn", "St. Gallen", "Thurgau", "Ticino",
    "Uri", "Vaud", "Valais", "Zug", "Zürich"
]

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nom: str
    prenom: str
    telephone: Optional[str] = None
    canton: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    nom: str
    prenom: str
    telephone: Optional[str] = None
    canton: str
    date_creation: datetime
    note_moyenne: Optional[float] = 0.0
    nombre_avis: int = 0

class ItemCreate(BaseModel):
    titre: str
    description: str
    categorie: str
    prix_par_jour: float
    frais_inscription: float = 5.0  # CHF 5 listing fee
    canton: str
    ville: str
    disponible: bool = True

class ItemResponse(BaseModel):
    id: str
    titre: str
    description: str
    categorie: str
    prix_par_jour: float
    frais_inscription: float
    canton: str
    ville: str
    disponible: bool
    proprietaire_id: str
    proprietaire_nom: str
    date_creation: datetime
    images: List[str] = []
    note_moyenne: Optional[float] = 0.0

class BookingCreate(BaseModel):
    item_id: str
    date_debut: datetime
    date_fin: datetime
    message: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    item_id: str
    item_titre: str
    locataire_id: str
    locataire_nom: str
    proprietaire_id: str
    date_debut: datetime
    date_fin: datetime
    prix_total: float
    statut: str  # "en_attente", "confirmee", "refusee", "terminee"
    message: Optional[str] = None
    date_creation: datetime

class MessageCreate(BaseModel):
    destinataire_id: str
    contenu: str
    booking_id: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    expediteur_id: str
    expediteur_nom: str
    destinataire_id: str
    contenu: str
    booking_id: Optional[str] = None
    date_envoi: datetime
    lu: bool = False

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    return user

# Database initialization
async def init_db():
    # Create indexes
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.items.create_index([("titre", TEXT), ("description", TEXT)])
    await db.items.create_index([("canton", ASCENDING), ("ville", ASCENDING)])
    await db.bookings.create_index([("item_id", ASCENDING)])
    await db.messages.create_index([("expediteur_id", ASCENDING), ("destinataire_id", ASCENDING)])

@app.on_event("startup")
async def startup_event():
    await init_db()

# Routes
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "P2P Share App API - Suisse"}

@app.get("/api/cantons")
async def get_cantons():
    return {"cantons": SWISS_CANTONS}

# Authentication routes
@app.post("/api/auth/register")
async def register(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Un utilisateur avec cet email existe déjà"
        )
    
    # Validate canton
    if user.canton not in SWISS_CANTONS:
        raise HTTPException(
            status_code=400,
            detail="Canton invalide"
        )
    
    # Create user
    hashed_password = hash_password(user.password)
    user_doc = {
        "email": user.email,
        "password": hashed_password,
        "nom": user.nom,
        "prenom": user.prenom,
        "telephone": user.telephone,
        "canton": user.canton,
        "date_creation": datetime.utcnow(),
        "note_moyenne": 0.0,
        "nombre_avis": 0
    }
    
    result = await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Utilisateur créé avec succès"
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    
    access_token = create_access_token(data={"sub": str(db_user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(db_user["_id"]),
            "email": db_user["email"],
            "nom": db_user["nom"],
            "prenom": db_user["prenom"]
        }
    }

@app.get("/api/auth/me", response_model=UserProfile)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return UserProfile(
        id=str(current_user["_id"]),
        email=current_user["email"],
        nom=current_user["nom"],
        prenom=current_user["prenom"],
        telephone=current_user.get("telephone"),
        canton=current_user["canton"],
        date_creation=current_user["date_creation"],
        note_moyenne=current_user.get("note_moyenne", 0.0),
        nombre_avis=current_user.get("nombre_avis", 0)
    )

# Item routes
@app.post("/api/items")
async def create_item(
    titre: str = Form(...),
    description: str = Form(...),
    categorie: str = Form(...),
    prix_par_jour: float = Form(...),
    canton: str = Form(...),
    ville: str = Form(...),
    files: List[UploadFile] = File([]),
    current_user: dict = Depends(get_current_user)
):
    if canton not in SWISS_CANTONS:
        raise HTTPException(status_code=400, detail="Canton invalide")
    
    # Handle file uploads
    image_urls = []
    for file in files:
        if file.filename:
            file_extension = file.filename.split('.')[-1]
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            image_urls.append(f"/uploads/{unique_filename}")
    
    item_doc = {
        "titre": titre,
        "description": description,
        "categorie": categorie,
        "prix_par_jour": prix_par_jour,
        "frais_inscription": 5.0,  # CHF 5 listing fee
        "canton": canton,
        "ville": ville,
        "disponible": True,
        "proprietaire_id": ObjectId(current_user["_id"]),
        "date_creation": datetime.utcnow(),
        "images": image_urls,
        "note_moyenne": 0.0
    }
    
    result = await db.items.insert_one(item_doc)
    
    return {
        "id": str(result.inserted_id),
        "message": "Objet créé avec succès"
    }

@app.get("/api/items")
async def search_items(
    q: Optional[str] = None,
    canton: Optional[str] = None,
    categorie: Optional[str] = None,
    prix_max: Optional[float] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {"disponible": True}
    
    if q:
        query["$text"] = {"$search": q}
    if canton:
        query["canton"] = canton
    if categorie:
        query["categorie"] = categorie
    if prix_max:
        query["prix_par_jour"] = {"$lte": prix_max}
    
    cursor = db.items.find(query).skip(skip).limit(limit)
    items = []
    
    async for item in cursor:
        # Get owner info
        owner = await db.users.find_one({"_id": item["proprietaire_id"]})
        items.append(ItemResponse(
            id=str(item["_id"]),
            titre=item["titre"],
            description=item["description"],
            categorie=item["categorie"],
            prix_par_jour=item["prix_par_jour"],
            frais_inscription=item["frais_inscription"],
            canton=item["canton"],
            ville=item["ville"],
            disponible=item["disponible"],
            proprietaire_id=str(item["proprietaire_id"]),
            proprietaire_nom=f"{owner['prenom']} {owner['nom']}" if owner else "Utilisateur",
            date_creation=item["date_creation"],
            images=item.get("images", []),
            note_moyenne=item.get("note_moyenne", 0.0)
        ))
    
    return {"items": items}

@app.get("/api/items/{item_id}")
async def get_item(item_id: str):
    try:
        item = await db.items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Objet non trouvé")
        
        owner = await db.users.find_one({"_id": item["proprietaire_id"]})
        
        return ItemResponse(
            id=str(item["_id"]),
            titre=item["titre"],
            description=item["description"],
            categorie=item["categorie"],
            prix_par_jour=item["prix_par_jour"],
            frais_inscription=item["frais_inscription"],
            canton=item["canton"],
            ville=item["ville"],
            disponible=item["disponible"],
            proprietaire_id=str(item["proprietaire_id"]),
            proprietaire_nom=f"{owner['prenom']} {owner['nom']}" if owner else "Utilisateur",
            date_creation=item["date_creation"],
            images=item.get("images", []),
            note_moyenne=item.get("note_moyenne", 0.0)
        )
    except Exception:
        raise HTTPException(status_code=400, detail="ID d'objet invalide")

# Booking routes
@app.post("/api/bookings")
async def create_booking(booking: BookingCreate, current_user: dict = Depends(get_current_user)):
    try:
        item = await db.items.find_one({"_id": ObjectId(booking.item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Objet non trouvé")
        
        if str(item["proprietaire_id"]) == str(current_user["_id"]):
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas réserver votre propre objet")
        
        # Calculate total price
        days = (booking.date_fin - booking.date_debut).days
        if days <= 0:
            raise HTTPException(status_code=400, detail="Dates invalides")
        
        prix_total = (item["prix_par_jour"] * days) + item["frais_inscription"]
        
        booking_doc = {
            "item_id": ObjectId(booking.item_id),
            "locataire_id": ObjectId(current_user["_id"]),
            "proprietaire_id": item["proprietaire_id"],
            "date_debut": booking.date_debut,
            "date_fin": booking.date_fin,
            "prix_total": prix_total,
            "statut": "en_attente",
            "message": booking.message,
            "date_creation": datetime.utcnow()
        }
        
        result = await db.bookings.insert_one(booking_doc)
        
        return {
            "id": str(result.inserted_id),
            "prix_total": prix_total,
            "message": "Demande de réservation envoyée"
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Erreur lors de la création de la réservation")

@app.get("/api/bookings/mes-reservations")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    bookings = []
    
    # Get bookings as renter
    cursor = db.bookings.find({"locataire_id": ObjectId(current_user["_id"])})
    async for booking in cursor:
        item = await db.items.find_one({"_id": booking["item_id"]})
        bookings.append(BookingResponse(
            id=str(booking["_id"]),
            item_id=str(booking["item_id"]),
            item_titre=item["titre"] if item else "Objet supprimé",
            locataire_id=str(booking["locataire_id"]),
            locataire_nom=f"{current_user['prenom']} {current_user['nom']}",
            proprietaire_id=str(booking["proprietaire_id"]),
            date_debut=booking["date_debut"],
            date_fin=booking["date_fin"],
            prix_total=booking["prix_total"],
            statut=booking["statut"],
            message=booking.get("message"),
            date_creation=booking["date_creation"]
        ))
    
    return {"reservations": bookings}

# Message routes
@app.post("/api/messages")
async def send_message(message: MessageCreate, current_user: dict = Depends(get_current_user)):
    try:
        recipient = await db.users.find_one({"_id": ObjectId(message.destinataire_id)})
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
        
        message_doc = {
            "expediteur_id": ObjectId(current_user["_id"]),
            "destinataire_id": ObjectId(message.destinataire_id),
            "contenu": message.contenu,
            "booking_id": ObjectId(message.booking_id) if message.booking_id else None,
            "date_envoi": datetime.utcnow(),
            "lu": False
        }
        
        result = await db.messages.insert_one(message_doc)
        
        return {
            "id": str(result.inserted_id),
            "message": "Message envoyé"
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Erreur lors de l'envoi du message")

@app.get("/api/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["_id"])
    
    # Get all messages involving current user
    messages = []
    cursor = db.messages.find({
        "$or": [
            {"expediteur_id": user_id},
            {"destinataire_id": user_id}
        ]
    }).sort("date_envoi", -1)
    
    async for message in cursor:
        sender = await db.users.find_one({"_id": message["expediteur_id"]})
        messages.append(MessageResponse(
            id=str(message["_id"]),
            expediteur_id=str(message["expediteur_id"]),
            expediteur_nom=f"{sender['prenom']} {sender['nom']}" if sender else "Utilisateur",
            destinataire_id=str(message["destinataire_id"]),
            contenu=message["contenu"],
            booking_id=str(message["booking_id"]) if message.get("booking_id") else None,
            date_envoi=message["date_envoi"],
            lu=message.get("lu", False)
        ))
    
    return {"messages": messages}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)