from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey, func, Enum
from database import Base
from datetime import datetime
import enum

class WalletCategory(str, enum.Enum):
    INITIAL = "initial"
    PURCHASE = "purchase"
    GIFT = "gift"
    REFUND = "refund"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str]
    wallet: Mapped[float] = mapped_column(default=0)
    rolling_debt: Mapped[float] = mapped_column(default=0)

    items: Mapped[list["Item"]] = relationship(back_populates="seller")
    bids: Mapped[list["Bid"]] = relationship(back_populates="bidder")
    debits: Mapped[list["Transaction"]] = relationship(back_populates="from_user", foreign_keys="transactions.from_id")
    credits: Mapped[list["Transaction"]] = relationship(back_populates="to_user", foreign_keys="transactions.to_id")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    desc: Mapped[str | None] = mapped_column(String(300))
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    base_price: Mapped[float]
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payment_updated: Mapped[bool] = mapped_column(default=0)
    winner_id: Mapped[int | None] = mapped_column(default=None)
    final_price: Mapped[float | None] = mapped_column(default=None)

    seller: Mapped["User"] = relationship(back_populates="items")
    bids: Mapped[list["Bid"]] = relationship(back_populates="item", cascade="all, delete-orphan")
    payments: Mapped[list["Transaction"]] = relationship(back_populates="related_item")


class Bid(Base):
    __tablename__ = "bids"

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[float] 
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    bidder_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    bidder: Mapped["User"] = relationship(back_populates="bids")
    item: Mapped["Item"] = relationship(back_populates="bids")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    to_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    amount: Mapped[float]
    category: Mapped[WalletCategory] = mapped_column(Enum(WalletCategory))
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    from_user: Mapped["User" | None] = relationship(back_populates="debits", foreign_keys="from_id")
    to_user: Mapped["User"] = relationship(back_populates="credits", foreign_keys="to_id")
    related_item: Mapped["Item" | None] = relationship(back_populates="payments")


    