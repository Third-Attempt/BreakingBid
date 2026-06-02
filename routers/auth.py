from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_session
from models import User
from schema import UserCreate, UserLogin, UserResponse
from security import create_token
import bcrypt

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.post("/register", response_model=UserResponse, status_code=201)
def create_user(user_data: UserCreate, session: SessionDep):
    password_hash = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(**user_data.model_dump(exclude={"password"}), password_hash=password_hash)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.post("/login", status_code=201)
def login(user_data: UserLogin, session: SessionDep):
    user = session.query(User).where(User.username==user_data.username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    if not bcrypt.checkpw(user_data.password.encode("utf-8"), user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Incorrect Password")
    
    token = create_token(user.id)
    return {"access_token": token, "token_type": "bearer"}
    
