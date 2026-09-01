"""Espiras de trafico de Madrid en tiempo real (informo.madrid.es, XML cada 5 minutos).

Por que un buscador de aparcamiento ingiere datos de trafico: es la unica senal en vivo que cubre
toda la ciudad y correlaciona con la presion de aparcamiento. Cuando las espiras de un barrio se
saturan, el bordillo de ese barrio tambien esta saturado. Es el rasgo mas fuerte del prior mientras
no haya usuarios suficientes, y sigue siendo util despues.

Coordenadas en UTM 30N (EPSG:25830); se reproyectan a WGS84 con pyproj.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from xml.etree import ElementTree

from app.config import Settings
from app.geo import Point
from app.ingest.http import fetch, to_float

UTM30N = "EPSG:25830"
WGS84 = "EPSG:4326"


@dataclass(frozen=True)
class TrafficReading:
    point_id: str
    location: Point
    intensity: float | None  # vehiculos/hora
    occupancy_pct: float | None  # % del tiempo con vehiculo encima de la espira
    load: float | None  # "carga" del Ayuntamiento: 0-100
    at: datetime

    @property
    def pressure(self) -> float:
        """Presion en [0, 1]. La carga ya viene normalizada; si no, se usa la ocupacion."""
        for value in (self.load, self.occupancy_pct):
            if value is not None:
                return min(max(value / 100.0, 0.0), 1.0)
        return 0.5


def _text(node: ElementTree.Element, *names: str) -> str | None:
    for name in names:
        found = node.find(name)
        if found is not None and found.text:
            return found.text.strip()
    return None


@lru_cache(maxsize=1)
def _transformer():
    from pyproj import Transformer  # dependencia opcional del extra `ingest`

    return Transformer.from_crs(UTM30N, WGS84, always_xy=True)


def _to_wgs84(x: float, y: float) -> Point:
    lon, lat = _transformer().transform(x, y)
    return (lon, lat)


def parse(xml_text: str, now: datetime | None = None) -> list[TrafficReading]:
    root = ElementTree.fromstring(xml_text)
    stamp = now or datetime.now(UTC)
    readings: list[TrafficReading] = []

    for node in root.iter("pm"):
        point_id = _text(node, "idelem", "id")
        x = to_float(_text(node, "st_x", "stX", "x") or "")
        y = to_float(_text(node, "st_y", "stY", "y") or "")
        if not point_id or x is None or y is None:
            continue
        readings.append(
            TrafficReading(
                point_id=f"madrid:pm:{point_id}",
                location=_to_wgs84(x, y),
                intensity=to_float(_text(node, "intensidad") or ""),
                occupancy_pct=to_float(_text(node, "ocupacion") or ""),
                load=to_float(_text(node, "carga") or ""),
                at=stamp,
            )
        )
    return readings


def load(settings: Settings) -> list[TrafficReading]:
    return parse(fetch(settings.madrid_traffic_url, settings).text)
