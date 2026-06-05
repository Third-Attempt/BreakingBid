from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_session
from models import User, Transaction, WalletCategory
from schema import UserCreate, UserLogin, UserResponse, WalletUpdate
from datetime import datetime, timezone
from security import create_token
import bcrypt

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

def updateWallet(from_id: int, to_id: int, item_id: int, amount: float, time: datetime):
    transaction = Transaction()
    transaction.from_id = from_id
    transaction.to_id = to_id
    transaction.item_id = item_id
    transaction.amount = amount
    transaction.category = WalletCategory.INITIAL
    transaction.time = time
    return transaction

@router.post("/register", response_model=UserResponse, status_code=201)
def create_user(user_data: UserCreate, session: SessionDep):
    password_hash = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(**user_data.model_dump(exclude={"password"}), password_hash=password_hash)
    now = datetime.now(timezone.utc)
    try:    
        session.add(user)
        session.flush()
        transaction = updateWallet(67, user.id, None, 10000, now)
        session.add(transaction)
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Username or Email already exists")
    return user

@router.get("/check-username/{username}")
def check_username(username: str, session: SessionDep):
    user = session.query(User).where(User.username == username).first()
    return {"available": user is None}

@router.post("/login", status_code=201)
def login(user_data: UserLogin, session: SessionDep):
    user = session.query(User).where(User.username==user_data.username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    if not bcrypt.checkpw(user_data.password.encode("utf-8"), user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Incorrect Password")
    
    token = create_token(user.id)
    return {"access_token": token, "token_type": "bearer"}
    
