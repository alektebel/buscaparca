"""GET /v1/predict - el mapa de calor: probabilidad de hueco por tramo a una hora dada."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_predictor
from app.schemas import PredictResponse, SegmentPrediction
from app.services.predictor import Predictor

router = APIRouter(prefix="/v1", tags=["predict"])

MAX_BBOX_DEG = 0.15  # ~15 km: mas que eso no cabe en una pantalla ni tiene sentido pedirlo


@router.get("/predict", response_model=PredictResponse)
def predict(
    min_lon: float = Query(...),
    min_lat: float = Query(...),
    max_lon: float = Query(...),
    max_lat: float = Query(...),
    at: datetime | None = Query(None, description="Momento a predecir. Por defecto, ahora."),
    predictor: Predictor = Depends(get_predictor),
) -> PredictResponse:
    if min_lon >= max_lon or min_lat >= max_lat:
        raise HTTPException(422, "bbox invalido")
    if (max_lon - min_lon) > MAX_BBOX_DEG or (max_lat - min_lat) > MAX_BBOX_DEG:
        raise HTTPException(422, "bbox demasiado grande")

    moment = at or datetime.now(UTC)
    segments, availability, ctx = predictor.for_bbox((min_lon, min_lat, max_lon, max_lat), moment)

    return PredictResponse(
        at=moment,
        traffic_pressure=ctx.traffic_pressure,
        segments=[
            SegmentPrediction(
                segment_id=s.id,
                name=s.name,
                geometry=s.geometry,
                capacity=s.capacity,
                ser_zone=s.ser_zone,
                p_free=availability[s.id].p_free,
                free_fraction=availability[s.id].free_fraction,
                confidence=availability[s.id].confidence,
            )
            for s in segments
            if s.id in availability
        ],
    )
