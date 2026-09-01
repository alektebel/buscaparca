"""Dependencias compartidas. Store, modelo y servicios se construyen una vez por proceso."""

from __future__ import annotations

from functools import lru_cache

from app.config import Settings, get_settings
from app.services.planner import Planner
from app.services.predictor import Predictor
from app.store import Store, get_store


@lru_cache
def get_shared_store() -> Store:
    return get_store(get_settings())


@lru_cache
def get_predictor() -> Predictor:
    return Predictor(get_shared_store(), get_settings())


@lru_cache
def get_planner() -> Planner:
    return Planner(get_predictor(), get_settings())


def settings() -> Settings:
    return get_settings()
