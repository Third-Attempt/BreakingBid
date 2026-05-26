from typing import Annotated
from fastapi import  APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_session
from models import User
from schema import UserCreate, UserResponse
from passlib.hash import bcrypt

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("/", response_model=list[UserResponse])
def get_users(session: SessionDep, page: int = 1):
    users = session.query(User).offset((page-1)*10).limit(10).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, session: SessionDep):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    return user

@router.post("/register", response_model=UserResponse, status_code=201)
def create_user(data: UserCreate, session: SessionDep):
    user = User(**data.model_dump(exclude={"password"}), password_hash=bcrypt.hash(data.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
