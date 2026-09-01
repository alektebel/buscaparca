"""Store en memoria: arranca la API sin Postgres para desarrollar el movil y para los tests."""

from __future__ import annotations

from datetime import UTC, datetime

from app.config import Settings
from app.domain import ParkEvent, Parking, Segment, SegmentStats, TimeContext
from app.geo import Point, haversine_m
from app.model.posterior import decay_weight
from app.store.demo import demo_parkings, demo_segments


class MemoryStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.segments: dict[str, Segment] = {}
        self.parkings: dict[str, Parking] = {}
        self.events: list[ParkEvent] = []

    @classmethod
    def with_demo_data(cls, settings: Settings) -> MemoryStore:
        store = cls(settings)
        store.load(demo_segments(), demo_parkings())
        return store

    def load(self, segments: list[Segment], parkings: list[Parking]) -> None:
        self.segments = {s.id: s for s in segments}
        self.parkings = {p.id: p for p in parkings}

    def segments_near(self, point: Point, radius_m: float) -> list[Segment]:
        return [s for s in self.segments.values() if haversine_m(point, s.centroid) <= radius_m]

    def segments_in_bbox(self, bbox: tuple[float, float, float, float]) -> list[Segment]:
        min_lon, min_lat, max_lon, max_lat = bbox
        out = []
        for s in self.segments.values():
            lon, lat = s.centroid
            if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                out.append(s)
        return out

    def parkings_near(self, point: Point, radius_m: float) -> list[Parking]:
        return [p for p in self.parkings.values() if haversine_m(point, p.location) <= radius_m]

    def stats_for(
        self, segment_ids: list[str], bucket: tuple[str, int], now: datetime
    ) -> dict[str, SegmentStats]:
        wanted = set(segment_ids)
        out: dict[str, SegmentStats] = {sid: SegmentStats() for sid in wanted}
        halflife = self.settings.posterior_halflife_days

        for event in self.events:
            if event.segment_id not in wanted:
                continue
            if _bucket_of(event.at) != bucket:
                continue
            age_days = (now - event.at).total_seconds() / 86400.0
            w = decay_weight(age_days, halflife)
            stats = out[event.segment_id]
            if event.kind == "park":
                stats.found += w
                stats.exposure_min += w * event.exposure_min
            elif event.kind == "cruise_no_spot":
                stats.missed += w
                stats.exposure_min += w * event.exposure_min
            elif event.kind == "unpark":
                stats.unparks += w
        return out

    def traffic_pressure(self, point: Point, when: datetime) -> float:
        """Sin espiras cargadas, una curva horaria de referencia de Madrid."""
        return default_traffic_pressure(when)

    def record_events(self, events: list[ParkEvent]) -> int:
        self.events.extend(events)
        return len(events)


def _bucket_of(when: datetime) -> tuple[str, int]:
    return TimeContext(when=when).bucket


# Curva de referencia de presion de trafico por hora (laborable). Sustituida por las espiras reales
# en cuanto corre la ingesta; sirve para que el store en memoria no prediga lo mismo a las 4:00 que
# a las 20:00, que seria absurdo.
_HOURLY_PRESSURE = [
    0.10,
    0.06,
    0.05,
    0.05,
    0.06,
    0.12,
    0.28,
    0.55,
    0.80,
    0.72,
    0.62,
    0.60,
    0.62,
    0.66,
    0.64,
    0.60,
    0.62,
    0.70,
    0.85,
    0.90,
    0.78,
    0.58,
    0.40,
    0.22,
]


def default_traffic_pressure(when: datetime) -> float:
    hour = when.hour
    base = _HOURLY_PRESSURE[hour]
    if when.weekday() == 5:
        return base * 0.85
    if when.weekday() == 6:
        return base * 0.65
    return base


def utcnow() -> datetime:
    return datetime.now(UTC)
