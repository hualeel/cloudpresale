from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

from app.config import settings

# 懒加载引擎：避免模块导入时就尝试连接数据库（方便测试和语法检查）
_engine = None
_SessionLocal = None


def _get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_db():
    _get_engine()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 供 Alembic env.py 和 init_db.py 使用
def get_sync_engine():
    return _get_engine()


class Base(DeclarativeBase):
    pass
