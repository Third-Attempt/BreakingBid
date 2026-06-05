from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_session
from models import Bid, Item, User
from schema import BidCreate, BidResponse
from datetime import datetime, timezone
from security import CurrentUser, verify_token
from connections import manager
from math import ceil

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("/", response_model=list[BidResponse])
def get_bids(user: CurrentUser, item_id: int, session: SessionDep, page: int = 1):
    bids = session.query(Bid).where(Bid.item_id==item_id).offset((page-1)*10).limit(10).all()
    return bids

@router.get("/{bid_id}", response_model=BidResponse)
def get_bid(user: CurrentUser, item_id: int, bid_id: int, session: SessionDep):
    bid = session.get(Bid, bid_id)
    if not bid or item_id != bid.item_id:
        raise HTTPException(status_code=404, detail="Bid Not Found")
    return bid

@router.post("/", response_model=BidResponse, status_code=201)
def create_bid(bidder: CurrentUser, item_id: int, data: BidCreate, session: SessionDep, bg_tasks: BackgroundTasks):
    item = session.query(Item).where(Item.id==item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item Not Found")
    
    bids = Bid(**data.model_dump(), bidder_id=bidder.id, item_id=item_id)
    now = datetime.now(timezone.utc)
    highest_bid = session.query(Bid).where(Bid.item_id==item_id).order_by(Bid.value.desc()).first()
    current_bidder = session.query(User).where(User.id==bidder.id).first()

    if highest_bid:
        highest_bidder = session.query(User).where(User.id==highest_bid.bidder_id).first()
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

    min_balance = 10
    current_bidder.rolling_debt += bids.value
    if highest_bid:
        highest_bidder.rolling_debt -= highest_bid.value
    if (current_bidder.rolling_debt + min_balance > current_bidder.wallet):
        raise HTTPException(status_code=400, detail="Needs to keep a minimum balance of Rs.10")

    session.add(bids)
    session.commit()
    session.refresh(bids)

    broadcast_data = {
        "type": "newbid",
        "value": data.value,
        "bidder_id": bidder.id,
        "bidder_name": bidder.username,
        "server_time": datetime.now(timezone.utc).isoformat()
    }
    notify_data = {
        "type": "outbid",
        "value": data.value,
        "bidder_id": bidder.id,
    }

    ''' 
    My First "Aha Moment" in Software Development ~ Maybe small, but it counts

    So basically, if we like send 20 requests to this function, 20 corouines are scheduled and it start by querying after using a connection from QueuePool, and then it runs till broadcast which is async so it waits and next coroutine picks up till 15.
    Then when 16th coroutine starts it looks for a connection, but all are waiting, so the event loop is stuck there, since querying with psycopg2 is synchronous, it can't wait and go do next job, its stuck forever.
    That is Event Loop Deadlock, so to fix it we can make use a asynchronous database driver which I will be doing on a later day, but for now I just made the whole thing synchronous and gave the asynchronous work to main event loop via BackgroundTasks
    I have more but this is not a blog!
    '''

    if highest_bid and highest_bid.bidder_id!=bidder.id:
        last_bid_user_id = highest_bid.bidder_id
        bg_tasks.add_task(manager.notify_outbid, last_bid_user_id, item_id, notify_data)
    
    bg_tasks.add_task(manager.broadcast, item_id, broadcast_data)

    return bids

@router.websocket("/ws")
async def broadcast_bid(item_id: int, websocket: WebSocket, token: str):
    try:
        user_id = verify_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return
    
    await manager.connect(user_id, item_id, websocket)

    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(user_id, item_id, websocket)


