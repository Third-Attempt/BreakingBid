from fastapi import FastAPI
from sqlalchemy import func
from database import Base, engine, Session
from routers import users, items, bids, auth, profile
from models import Item, User, Bid, Transaction, WalletCategory
from datetime import datetime, timezone, timedelta
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os

load_dotenv()

Base.metadata.create_all(engine)

def updateWallet(from_id: int, to_id: int, item_id: int, amount: float, time: datetime):
    transaction = Transaction()
    transaction.from_id = from_id
    transaction.to_id = to_id
    transaction.item_id = item_id
    transaction.amount = amount
    transaction.category = WalletCategory.PURCHASE
    transaction.time = time
    return transaction

async def sync_wallets():
    while 67:
        await asyncio.sleep(60)

        try:
            session = Session()
            now = datetime.now(timezone.utc)
            query = session.query(Item, Bid.value.label("price"), Bid.bidder_id.label("id"))
            query = query.where(Item.payment_updated==0, Item.end_time<now-timedelta(seconds=10))
            query = query.outerjoin(Bid, Item.id==Bid.item_id).order_by(Item.id, Bid.value.desc())
            items = query.distinct(Item.id).all()
            for item, price, id in items:
                if id:
                    buyer = session.query(User).where(User.id==id).first()
                    seller = session.query(User).where(User.id==item.seller_id).first()
                    buyer.rolling_debt -= price
                    buyer.wallet -= price
                    seller.wallet += price
                    transaction = updateWallet(buyer.id, seller.id, item.id, price, now)
                    session.add(transaction)
                    session.refresh()   
                    item.winner_id = id;
                    item.final_price = price;
                item.payment_updated = 1

            session.commit()
            
        except:
            session.rollback()
        finally:
            session.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    sweep = asyncio.create_task(sync_wallets())
    yield
    sweep.cancel()

app = FastAPI(lifespan=lifespan)

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
app.include_router(profile.router, prefix="/profile", tags=["profile"])

@app.get('/')
def root():
    return {"hello": "world"}

@app.get('/server-time')
def server_time():
    return {"server_time": datetime.now(timezone.utc).isoformat()}