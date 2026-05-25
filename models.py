from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey, Enum, func
from database import Base
from datetime import datetime
import enum

class ItemStatus(enum.Enum):
    upcoming = "upcoming"
    active = "active"
    sold = "sold"
    unsold = "unsold"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str]

    items: Mapped[list["Item"]] = relationship(back_populates="seller")
    bids: Mapped[list["Bid"]] = relationship(back_populates="bidder")

class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    desc: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[ItemStatus] = mapped_column(Enum(ItemStatus), default=ItemStatus.upcoming)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    base_price: Mapped[float]
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    seller: Mapped["User"] = relationship(back_populates="items")
    bids: Mapped[list["Bid"]] = relationship(back_populates="item", cascade="all, delete-orphan")


class Bid(Base):
    __tablename__ = "bids"

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[float] 
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    bidder_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    bidder: Mapped["User"] = relationship(back_populates="bids")
    item: Mapped["Item"] = relationship(back_populates="bids")

