from app.config import Settings
from app.store.base import Store


def get_store(settings: Settings) -> Store:
    """SQLite si hay BUSCAPARCA_SQLITE_PATH; si no, el store en memoria con datos de demo."""
    if settings.sqlite_path:
        from app.store.sqlite import SqliteStore

        return SqliteStore(settings, settings.sqlite_path)

    from app.store.memory import MemoryStore

    return MemoryStore.with_demo_data(settings)


__all__ = ["Store", "get_store"]
