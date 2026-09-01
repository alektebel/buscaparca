"""BuscaParca API."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import events, geocode, plan, predict
from app.config import get_settings

app = FastAPI(
    title="BuscaParca",
    version="0.1.0",
    summary="Aparcar rapido: prediccion bayesiana de huecos y parada optima.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(plan.router)
app.include_router(events.router)
app.include_router(geocode.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "city": settings.city,
        "store": settings.sqlite_path or "memoria (demo)",
    }
