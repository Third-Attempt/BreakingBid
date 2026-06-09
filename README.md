# BreakingBid


**[Live Website](https://breaking-bid.vercel.app/)**

BreakingBid is a full-stack auction platform themed around the Breaking Bad universe. 

This is my first major project. I built it specifically to dive into backend engineering. Since I only know frontend at a high level, I just had AI write the fontend so I could stay totally focused on learning APIs, routing, and databases. That's why the UI looks really nice. The backend, however, was built entirely by hand from scratch as a learning ground for Python, FastAPI, and SQLAlchemy.

## Technical Highlights & Architecture


### 1. Real-Time WebSockets & Concurrency
The prime focus of this project was handling real-time, concurrent bidding:
- **Race Condition Prevention:** Implemented PostgreSQL row-level locking (`with_for_update`) to ensure bid integrity when multiple users strike an item at the exact same millisecond.
- **Event Loop Deadlock Resolution:** Mixing synchronous database queries with asynchronous WebSocket broadcasting initially froze the connection pool. This was resolved by offloading WebSocket broadcasts to FastAPI's `BackgroundTasks`, keeping the main thread clear to process DB queries instantly. This debugging process was the catalyst that made `async`/`await` and coroutines fully click in my head.

### 2. The Background Sweeper
To finalize auctions the moment their `end_time` passes, I built a native background task manager:
- **FastAPI Lifespan:** Used `@asynccontextmanager` to spin up an `asyncio.create_task()` loop during server startup.
- **Graceful Shutdown:** The loop is safely aborted during server shutdown via `task.cancel()`, preventing the Uvicorn web server from hanging.

### 3. The Escrow Economy
Instead of a basic balance system, BreakingBid runs on a robust escrow model:
- **`wallet`**: Settled cash balance.
- **`rolling_debt`**: Temporary holds placed on users when they hold the highest active bid, preventing them from bidding money they don't have.
- **Transactions Ledger:** A permanent, double-entry audit trail mapping all fund movements with strict SQLAlchemy constraints.

## Tech Stack

- **Backend:** FastAPI, Python 3, WebSockets
- **Database:** SQLAlchemy ORM, PostgreSQL (production) / SQLite (local)
- **Frontend:** React, Vite, Tailwind CSS
- **Authentication:** JWT (JSON Web Tokens), bcrypt hashing

## Local Setup

### 1. Environment Variables
Create a `.env` file in the `Backend` directory:
```env
# Note: This is for local testing. In production, a PostgreSQL URL is used.
DATABASE_URL=sqlite:///./breakingbid.db
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=42
FRONTEND_URL=http://localhost:5173
```

Create another `.env` file in the `Frontend` directory:
```env
VITE_API_URL=http://localhost:8000
```

### 2. Backend Setup
Navigate to the `Backend` folder, set up a virtual environment, and run the server:
```bash
cd Backend
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
uvicorn main:app --reload
```

### 3. Frontend Setup
Open a new terminal, navigate to the `Frontend` folder, and start the dev server:
```bash
cd Frontend
npm install
npm run dev
```

---
> *Built as a learning project for backend development, database architecture, and real-time systems.*
