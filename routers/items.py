from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_session
from models import Item, ItemStatus
from schema import ItemCreate, ItemResponse

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("/", response_model=list[ItemResponse])
def get_all_items(session: SessionDep, page: int = 1):
    items = session.query(Item).offset((page-1)*10).limit(10).all()
    return items

@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, session: SessionDep):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item Not Found")
    return item

@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(data: ItemCreate, session: SessionDep):
    item = Item(**data.model_dump(), status=ItemStatus.upcoming, seller_id=1)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item
