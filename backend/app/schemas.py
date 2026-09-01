"""Contratos de la API. Coordenadas siempre [lon, lat], como GeoJSON."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SegmentPrediction(BaseModel):
    segment_id: str
    name: str
    geometry: list[tuple[float, float]]
    capacity: int
    ser_zone: str | None
    p_free: float = Field(description="Probabilidad de encontrar hueco al recorrer el tramo")
    free_fraction: float
    confidence: float = Field(description="0 = el modelo no tiene ni idea, 1 = certeza")


class PredictResponse(BaseModel):
    at: datetime
    traffic_pressure: float
    segments: list[SegmentPrediction]


class PlanRequest(BaseModel):
    lat: float
    lon: float
    arrive_at: datetime | None = Field(
        default=None,
        description="Hora de llegada prevista. Se predice para ESE momento, no para ahora.",
    )
    hurry: float = Field(default=0.5, ge=0.0, le=1.0, description="0 = sin prisa, 1 = aparca ya")
    stay_hours: float = Field(default=2.0, gt=0.0, le=24.0)
    radius_m: float | None = None


class PlanStep(BaseModel):
    order: int
    segment_id: str
    name: str
    geometry: list[tuple[float, float]]
    p_free: float
    confidence: float
    walk_min: float
    walk_m: float
    price_eur: float
    accept: bool = Field(description="Si hay hueco aqui, ¿lo cojo o sigo?")
    accept_threshold_m: float = Field(description="Radio de aceptacion vigente en este paso")
    give_up: bool = Field(description="Si llegas aqui sin nada, deja de buscar y vete al parking")


class FallbackOut(BaseModel):
    id: str
    name: str
    walk_min: float
    price_eur: float


class PlanResponse(BaseModel):
    destination: tuple[float, float]
    at: datetime
    accept_threshold_m: float = Field(
        description="Acepta cualquier hueco a menos de esta distancia del destino"
    )
    accept_anything: bool = Field(
        description="El umbral supera el corredor entero: coge el primer hueco que veas"
    )
    expected_minutes: float
    expected_price_eur: float = Field(description="Dinero previsto: SER o parking, en euros")
    p_street: float = Field(description="Probabilidad de acabar aparcando en la calle")
    give_up_after: int | None = Field(
        default=None,
        description="Orden del tramo a partir del cual ya no compensa seguir buscando",
    )
    fallback: FallbackOut
    steps: list[PlanStep]


class EventIn(BaseModel):
    segment_id: str
    kind: str = Field(pattern="^(park|unpark|cruise_no_spot)$")
    at: datetime
    exposure_min: float = Field(default=0.0, ge=0.0, le=120.0)


class EventBatch(BaseModel):
    events: list[EventIn] = Field(max_length=200)


class EventAck(BaseModel):
    accepted: int


class GeocodeHit(BaseModel):
    label: str
    lat: float
    lon: float
