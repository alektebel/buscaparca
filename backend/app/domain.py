"""Tipos del dominio, compartidos por el modelo, la ingesta y la API."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.geo import Point, polyline_midpoint

# Tipos de zona del Servicio de Estacionamiento Regulado de Madrid.
SER_AZUL = "azul"
SER_VERDE = "verde"
SER_LARGA = "larga_estancia"
SER_SANITARIA = "sanitaria"
SER_LIBRE = None

# Tarifa media por hora segun tipo de zona (EUR). Es un valor de referencia para el planificador:
# la tarifa real depende del distintivo ambiental y del tramo horario.
SER_RATE_EUR_H: dict[str | None, float] = {
    SER_AZUL: 2.40,
    SER_VERDE: 2.40,
    SER_LARGA: 0.90,
    SER_SANITARIA: 2.40,
    SER_LIBRE: 0.0,
}


@dataclass(frozen=True)
class Segment:
    """Un tramo de calle: la unidad de modelado.

    El aparcamiento en calle es lineal, no areal, asi que se modela por tramo (un way de OSM
    partido en intersecciones, tipicamente 50-150 m) y no por celda hexagonal.
    """

    id: str
    name: str
    geometry: list[Point]
    length_m: float
    capacity: int
    ser_zone: str | None = None
    poi_density: float = 0.0  # POIs de ocio/trabajo por cada 100 m
    barrio: str | None = None

    @property
    def centroid(self) -> Point:
        return polyline_midpoint(self.geometry)

    @property
    def ser_rate_eur_h(self) -> float:
        return SER_RATE_EUR_H.get(self.ser_zone, 0.0)

    @property
    def is_regulated(self) -> bool:
        return self.ser_zone is not None


@dataclass(frozen=True)
class Parking:
    """Aparcamiento de pago. Es la opcion terminal del planificador."""

    id: str
    name: str
    location: Point
    total_spaces: int
    rate_eur_h: float
    free_spaces: int | None = None
    updated_at: datetime | None = None

    @property
    def has_room(self) -> bool:
        # Sin dato en vivo asumimos que hay sitio: un parking casi nunca esta lleno del todo.
        return self.free_spaces is None or self.free_spaces > 0


@dataclass(frozen=True)
class TimeContext:
    """Momento para el que se predice, mas el contexto que hace que la prediccion cambie."""

    when: datetime
    is_holiday: bool = False
    traffic_pressure: float = 0.5  # 0 = calles vacias, 1 = hora punta severa
    rain: bool = False

    @property
    def day_type(self) -> str:
        if self.is_holiday or self.when.weekday() == 6:
            return "festivo"
        if self.when.weekday() == 5:
            return "sabado"
        return "laborable"

    @property
    def hour(self) -> int:
        return self.when.hour

    @property
    def bucket(self) -> tuple[str, int]:
        """72 franjas (3 tipos de dia x 24 h) en vez de 168: menos dispersion de datos."""
        return (self.day_type, self.hour)


EventKind = str  # "park" | "unpark" | "cruise_no_spot"


@dataclass(frozen=True)
class ParkEvent:
    """Observacion subida por un movil, ya ajustada a un tramo (nunca la traza GPS)."""

    segment_id: str
    kind: EventKind
    at: datetime
    # Minutos que el movil estuvo recorriendo el tramo buscando. Solo en cruise_no_spot.
    exposure_min: float = 0.0


@dataclass
class SegmentStats:
    """Evidencia acumulada de un tramo en una franja, ya con decaimiento aplicado."""

    found: float = 0.0  # busquedas que acabaron en hueco
    missed: float = 0.0  # busquedas que no encontraron nada
    unparks: float = 0.0  # huecos observados liberarse
    exposure_min: float = 0.0  # minutos de observacion que respaldan `unparks`
    extras: dict[str, float] = field(default_factory=dict)
