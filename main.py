from fastapi import FastAPI
from database import Base, engine
from models import User, Item, Bid
from routers import users, items, bids

Base.metadata.create_all(engine)

app = FastAPI()

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(items.router, prefix="/items", tags=["items"])
app.include_router(bids.router, prefix="/items/{item_id}/bids", tags=["bids"])

@app.get('/')
def root():
    return {"hello": "world"}

