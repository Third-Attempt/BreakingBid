from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

class Base(DeclarativeBase):
    pass

database_url = "sqlite:///./breakingbid.db"
connect_args = {"check_same_thread": False}
engine = create_engine(database_url, connect_args=connect_args)

Session = sessionmaker(engine, autoflush=False)

def get_session():
    session = Session()
    try:
        yield session
    except:
        session.rollback()
        raise
    finally:
        session.close()


