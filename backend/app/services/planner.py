"""Servicio del planificador: destino -> corredor -> parada optima."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.config import Settings
from app.domain import Segment
from app.geo import Point, haversine_m
from app.model.availability import Availability
from app.model.corridor import build_corridor, choose_fallback, walking_minutes
from app.model.stopping import StoppingPlan, Weights, solve
from app.services.predictor import Predictor

# Se buscan parkings algo mas lejos que el corredor: un parking a 1 km sigue siendo mejor que
# quince minutos de vueltas.
FALLBACK_SEARCH_RADIUS_M = 1500.0


@dataclass(frozen=True)
class PlanResult:
    destination: Point
    at: datetime
    plan: StoppingPlan
    segments: dict[str, Segment]
    availability: dict[str, Availability]
    settings: Settings

    def walk_metres(self, walk_min: float) -> float:
        return (
            walk_min * (self.settings.walk_speed_kmh * 1000.0 / 60.0) / self.settings.detour_factor
        )


class Planner:
    def __init__(self, predictor: Predictor, settings: Settings) -> None:
        self.predictor = predictor
        self.settings = settings

    def plan(
        self,
        destination: Point,
        arrive_at: datetime | None = None,
        hurry: float = 0.5,
        stay_hours: float = 2.0,
        radius_m: float | None = None,
    ) -> PlanResult:
        at = arrive_at or datetime.now(UTC)
        radius = radius_m or self.settings.max_corridor_radius_m

        segments = self.predictor.store.segments_near(destination, radius)
        ctx = self.predictor.context(at, destination)
        availability = self.predictor.estimate(segments, ctx)

        parkings = self.predictor.store.parkings_near(destination, FALLBACK_SEARCH_RADIUS_M)
        fallback, fallback_location = choose_fallback(
            destination, parkings, self.settings, stay_hours
        )

        candidates = build_corridor(
            destination=destination,
            segments=segments,
            availability=availability,
            settings=self.settings,
            stay_hours=stay_hours,
            fallback_location=fallback_location,
        )
        plan = solve(candidates, fallback, Weights.from_hurry(hurry))

        return PlanResult(
            destination=destination,
            at=at,
            plan=plan,
            segments={s.id: s for s in segments},
            availability=availability,
            settings=self.settings,
        )

    def walk_minutes_to(self, destination: Point, point: Point) -> float:
        return walking_minutes(haversine_m(destination, point), self.settings)
