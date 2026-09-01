"""Servicio de prediccion: store + modelo -> disponibilidad por tramo."""

from __future__ import annotations

from datetime import datetime

from app.config import Settings
from app.domain import Segment, TimeContext
from app.geo import Point
from app.model.availability import Availability, AvailabilityModel
from app.model.prior import PriorModel
from app.store.base import Store


class Predictor:
    def __init__(self, store: Store, settings: Settings, prior: PriorModel | None = None) -> None:
        self.store = store
        self.settings = settings
        self.model = AvailabilityModel(prior or PriorModel.cold_start(), settings)

    def context(self, at: datetime, near: Point) -> TimeContext:
        return TimeContext(when=at, traffic_pressure=self.store.traffic_pressure(near, at))

    def estimate(
        self,
        segments: list[Segment],
        ctx: TimeContext,
        traversal_min: dict[str, float] | None = None,
    ) -> dict[str, Availability]:
        ids = [s.id for s in segments]
        stats = self.store.stats_for(ids, ctx.bucket, ctx.when)
        out: dict[str, Availability] = {}
        for segment in segments:
            tau = (traversal_min or {}).get(segment.id)
            out[segment.id] = self.model.estimate(segment, ctx, stats.get(segment.id), tau)
        return out

    def for_bbox(
        self, bbox: tuple[float, float, float, float], at: datetime
    ) -> tuple[list[Segment], dict[str, Availability], TimeContext]:
        segments = self.store.segments_in_bbox(bbox)
        centre = ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)
        ctx = self.context(at, centre)
        return segments, self.estimate(segments, ctx), ctx
