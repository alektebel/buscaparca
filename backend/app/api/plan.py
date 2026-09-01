"""POST /v1/plan - la respuesta a "¿donde aparco?": corredor + umbral de aceptacion."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_planner
from app.schemas import FallbackOut, PlanRequest, PlanResponse, PlanStep
from app.services.planner import Planner

router = APIRouter(prefix="/v1", tags=["plan"])


@router.post("/plan", response_model=PlanResponse)
def make_plan(body: PlanRequest, planner: Planner = Depends(get_planner)) -> PlanResponse:
    result = planner.plan(
        destination=(body.lon, body.lat),
        arrive_at=body.arrive_at,
        hurry=body.hurry,
        stay_hours=body.stay_hours,
        radius_m=body.radius_m,
    )
    plan = result.plan
    threshold_m = result.walk_metres(plan.accept_walk_threshold_min)
    corridor_m = result.settings.max_corridor_radius_m

    steps = []
    for i, decision in enumerate(plan.decisions):
        segment = result.segments[decision.candidate.segment_id]
        steps.append(
            PlanStep(
                order=i,
                segment_id=segment.id,
                name=segment.name,
                geometry=segment.geometry,
                p_free=decision.candidate.p_free,
                confidence=decision.candidate.confidence,
                walk_min=decision.candidate.walk_min,
                walk_m=result.walk_metres(decision.candidate.walk_min),
                price_eur=decision.candidate.price_eur,
                accept=decision.accept,
                give_up=decision.bail,
                accept_threshold_m=min(result.walk_metres(decision.walk_threshold_min), corridor_m),
            )
        )

    return PlanResponse(
        destination=result.destination,
        at=result.at,
        accept_threshold_m=min(threshold_m, corridor_m),
        accept_anything=threshold_m >= corridor_m,
        expected_minutes=plan.expected_minutes,
        expected_price_eur=plan.expected_price_eur,
        p_street=plan.p_street,
        give_up_after=plan.give_up_index,
        fallback=FallbackOut(
            id=plan.fallback.id,
            name=plan.fallback.label,
            walk_min=plan.fallback.walk_min,
            price_eur=plan.fallback.price_eur,
        ),
        steps=steps,
    )
