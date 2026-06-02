from fastapi import FastAPI
from database import Base, engine
from routers import users, items, bids, auth
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

Base.metadata.create_all(engine)

app = FastAPI()

app.add_middleware (
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(items.router, prefix="/items", tags=["items"])
app.include_router(bids.router, prefix="/items/{item_id}/bids", tags=["bids"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get('/')
def root():
    return {"hello": "world"}

@app.get('/server-time')
def server_time():
    return {"server_time": datetime.now(timezone.utc).isoformat()}