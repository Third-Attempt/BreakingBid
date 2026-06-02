from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_session
from models import Item, Bid
from schema import ItemCreate, ItemResponse
from security import CurrentUser
from datetime import datetime, timezone, timedelta

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("/", response_model=list[ItemResponse])
def get_all_items(session: SessionDep, page: int = 1):
    items = session.query(Item).offset((page-1)*10).limit(10).all()
    response = []
    for item in items:
        highest_bid = session.query(Bid).where(Bid.item_id==item.id).order_by(Bid.value.desc()).first()
        if highest_bid:
            current_price = highest_bid.value
        else:
            current_price = item.base_price
        data = ItemResponse.model_validate(item)
        data.current_price = current_price
        response.append(data)
    return response

@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, session: SessionDep):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item Not Found")
    highest_bid = session.query(Bid).where(Bid.item_id==item_id).order_by(Bid.value.desc()).first()
    now = datetime.now(timezone.utc)
    response = ItemResponse.model_validate(item)
        
    if highest_bid and now > item.end_time:
        response = ItemResponse(**response.model_dump(), winner=highest_bid.bidder, final_price=highest_bid.value) 
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
