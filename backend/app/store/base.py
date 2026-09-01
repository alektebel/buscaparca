"""Interfaz de acceso a datos. El modelo y la API no saben si detras hay PostGIS o un dict."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.domain import ParkEvent, Parking, Segment, SegmentStats
from app.geo import Point


class Store(Protocol):
    def segments_near(self, point: Point, radius_m: float) -> list[Segment]: ...

    def segments_in_bbox(self, bbox: tuple[float, float, float, float]) -> list[Segment]: ...

    def parkings_near(self, point: Point, radius_m: float) -> list[Parking]: ...

    def stats_for(
        self, segment_ids: list[str], bucket: tuple[str, int], now: datetime
    ) -> dict[str, SegmentStats]:
        """Evidencia acumulada por tramo para esa franja, con decaimiento ya aplicado."""
        ...

    def traffic_pressure(self, point: Point, when: datetime) -> float:
        """Presion de trafico en [0, 1] cerca del punto: el proxy en vivo de 'esta petado'."""
        ...

    def record_events(self, events: list[ParkEvent]) -> int: ...


class WritableStore(Store, Protocol):
    """Lo que ademas necesita la ingesta; el store en memoria no lo implementa entero."""

    def upsert_segments(self, segments: list[Segment]) -> int: ...

    def upsert_parkings(self, parkings: list[Parking]) -> int: ...
