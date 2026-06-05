from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from database import get_session
from models import Item, Bid
from schema import ItemCreate, ItemResponse
from security import CurrentUser
from datetime import datetime, timezone, timedelta

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("/", response_model=list[ItemResponse])
def get_all_items(user: CurrentUser, session: SessionDep, page: int = 1, search : str = "", status: int = 0, sort: bool = 0):
    now = datetime.now(timezone.utc)
    query = session.query(Item, (func.coalesce(func.max(Bid.value), Item.base_price)).label("current_price")).outerjoin(Bid, Bid.item_id==Item.id).group_by(Item.id)
    query = query.where(Item.name.ilike(f"%{search}%"))

    if sort:
        query = query.order_by(func.coalesce(func.max(Bid.value), Item.base_price).desc())

    # Ongoing
    if status==0:
        query = query.where(Item.start_time<now, Item.end_time>now).order_by(Item.id.desc())
    # Upcoming
    elif status==1:
        query = query.where(Item.start_time>now).order_by(Item.start_time)
    # Finished
    elif status==2:
        query = query.where(Item.end_time<now).order_by(Item.end_time.desc())

    items = query.offset((page-1)*10).limit(10).all()

    response = []
    for item, current_price in items:
        data = ItemResponse.model_validate(item)
        data.current_price = current_price
        response.append(data)

    return response

@router.get("/{item_id}", response_model=ItemResponse)
def get_item(user: CurrentUser, item_id: int, session: SessionDep):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item Not Found")
    highest_bid = session.query(Bid).where(Bid.item_id==item_id).order_by(Bid.value.desc()).first()
    now = datetime.now(timezone.utc)
    response = ItemResponse.model_validate(item)
        
    if highest_bid and now > item.end_time:
        winner = {"id": highest_bid.bidder_id, "username": highest_bid.bidder.username}
        response = ItemResponse.model_validate(item)
        response.winner = winner
        response.final_price = highest_bid.value
    return response

@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(seller: CurrentUser, data: ItemCreate, session: SessionDep):
    item = Item(**data.model_dump(), seller_id=seller.id)
    now = datetime.now(timezone.utc)
    if item.end_time - timedelta(minutes=5) < max(now, item.start_time):
        raise HTTPException(status_code=400, detail="Auction has to last atleast 5 minutes")
    session.add(item)
    session.commit()
    session.refresh(item)
    return item
