from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database import get_session
from models import Item, Bid, Transaction
from schema import ItemResponse, BidResponse, WalletResponse
from security import CurrentUser

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.get('/items', response_model=list[ItemResponse])
def get_user_items(user: CurrentUser, session: SessionDep, factor: int):
    query = session.query(Item).where(or_(Item.seller_id==user.id, Item.winner_id==user.id))
    if factor==0:
        query = query.order_by(Item.end_time.desc())
    elif factor==1:
        query = query.order_by(Item.final_price.desc())
    items = query.all()
    return items

@router.get('/bids', response_model=list[BidResponse])
def get_user_bids(user: CurrentUser, session: SessionDep, factor: int):
    query = session.query(Bid).where(Bid.bidder_id==user.id)
    if factor==0:
        query = query.order_by(Bid.created_at.desc())
    elif factor==1:
        query = query.order_by(Bid.value.desc())
    bids = query.all()
    return bids

@router.get('/wallet', response_model=list[WalletResponse])
def get_wallet(user: CurrentUser, session: SessionDep, factor: int):
    query = session.query(Transaction).where(or_(Transaction.from_id==user.id, Transaction.to_id==user.id))
    if factor==0:
        query = query.order_by(Transaction.time.desc())
    elif factor==1:
        query = query.order_by(Transaction.amount.desc())
    wallet = query.all()
    return wallet

