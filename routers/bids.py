from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_session
from models import Bid, Item
from schema import BidCreate, BidResponse
from datetime import datetime, timezone
from security import CurrentUser, verify_token
from connections import manager
from math import ceil

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("/", response_model=list[BidResponse])
def get_bids(item_id: int, session: SessionDep, page: int = 1):
    bids = session.query(Bid).where(Bid.item_id==item_id).offset((page-1)*10).limit(10).all()
    return bids

@router.get("/{bid_id}", response_model=BidResponse)
def get_bid(item_id: int, bid_id: int, session: SessionDep):
    bid = session.get(Bid, bid_id)
    if not bid or item_id != bid.item_id:
        raise HTTPException(status_code=404, detail="Bid Not Found")
    return bid

@router.post("/", response_model=BidResponse, status_code=201)
async def create_bid(bidder: CurrentUser, item_id: int, data: BidCreate, session: SessionDep):
    item = session.query(Item).where(Item.id==item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item Not Found")
    
    bids = Bid(**data.model_dump(), bidder_id=bidder.id, item_id=item_id)
    now = datetime.now(timezone.utc)
    highest_bid = session.query(Bid).where(Bid.item_id==item_id).order_by(Bid.value.desc()).first()
    if highest_bid:
        delta = ceil(highest_bid.value*0.0033)
    else:
        delta = ceil(item.base_price*0.0033)

    if now < item.start_time:
        raise HTTPException(status_code=400, detail="Auction hasn't Started")
    if now > item.end_time:
        raise HTTPException(status_code=400, detail="Auction has Ended")
    if not highest_bid and bids.value <= (item.base_price + delta):
        raise HTTPException(status_code=400, detail=f"Base Price is {item.base_price} and next bid must exceed {item.base_price + delta}")
    if highest_bid and bids.value <= (highest_bid.value + delta):
        raise HTTPException(status_code=400, detail=f"highest bid is {highest_bid.value} and bid must exceed {highest_bid.value + delta}")

    session.add(bids)
    session.commit()
    session.refresh(bids)

    broadcast_data = {
        "value": data.value,
        "bidder_id": bidder.id,
    }
    await manager.broadcast(item_id, broadcast_data)

    return bids

@router.websocket("/ws")
async def broadcast_bid(item_id: int, websocket: WebSocket, token: str):
    try:
        user_id = verify_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return
    
    await manager.connect(item_id, websocket)

    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(item_id, websocket)


