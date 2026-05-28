from pydantic import BaseModel
from datetime import datetime
from models import ItemStatus

class ResModel(BaseModel):
    class Config:
        from_attributes = True

class UserData(ResModel):
    id: int
    username: str

class ItemData(ResModel):
    id: int
    name: str
    status: ItemStatus

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(ResModel):
    id: int
    username: str
    email: str

class ItemCreate(BaseModel):
    name: str
    desc: str | None = None
    base_price: float
    start_time: datetime
    end_time: datetime

class ItemResponse(ResModel):
    id: int
    name: str
    desc: str | None
    status: ItemStatus
    seller: UserData
    base_price: float
    start_time: datetime
    end_time: datetime

class BidCreate(BaseModel):
    value: float

class BidResponse(ResModel):
    id: int
    value: float
    item: ItemData
    bidder: UserData
    created_at: datetime