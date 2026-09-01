"""Aparcamientos rotacionales de Madrid con ocupacion en tiempo real.

Dataset 50027 del portal de datos abiertos del Ayuntamiento. Es la **opcion terminal** del
planificador: sin un parking real, con su tarifa y sus plazas libres de verdad, el problema de
parada optima no tiene fondo y el modelo te dejaria dando vueltas para siempre.

El portal sirve JSON-LD estilo eGob (`@graph` con `location.latitude/longitude`), pero los nombres
de los campos de ocupacion han cambiado entre versiones del dataset. Por eso la extraccion es por
nombre de clave y no por ruta fija, y por eso existe `python -m app.ingest.run inspect`: la primera
vez que corras esto contra el portal, mira lo que imprime y fija los nombres aqui.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.config import Settings
from app.domain import Parking
from app.ingest.http import fetch, find_number, find_text

FREE_KEYS = ("libres", "plazaslibres", "freespaces", "plazas_libres", "ocupacionlibres")
TOTAL_KEYS = ("plazastotales", "capacidad", "totalspaces", "numplazas", "plazas")
RATE_KEYS = ("tarifa", "precio", "preciohora", "tarifahora")
LAT_KEYS = ("latitude", "latitud", "lat")
LON_KEYS = ("longitude", "longitud", "lon", "lng")

DEFAULT_RATE_EUR_H = 3.20  # tarifa de referencia en el centro si el dataset no la trae


def parse(payload: dict[str, Any], now: datetime | None = None) -> list[Parking]:
    records = payload.get("@graph") or payload.get("graph") or payload.get("data") or []
    if isinstance(records, dict):
        records = [records]

    parkings: list[Parking] = []
    for record in records:
        if not isinstance(record, dict):
            continue
        lat = find_number(record, LAT_KEYS)
        lon = find_number(record, LON_KEYS)
        if lat is None or lon is None:
            continue

        name = find_text(record, ("title", "nombre", "name")) or "Aparcamiento"
        raw_id = find_text(record, ("id", "identificador", "@id")) or name
        total = find_number(record, TOTAL_KEYS)
        free = find_number(record, FREE_KEYS)
        rate = find_number(record, RATE_KEYS)

        parkings.append(
            Parking(
                id=f"madrid:{raw_id.rsplit('/', 1)[-1]}",
                name=name,
                location=(lon, lat),
                total_spaces=int(total) if total else 0,
                rate_eur_h=rate if rate else DEFAULT_RATE_EUR_H,
                free_spaces=int(free) if free is not None else None,
                updated_at=now or datetime.now(UTC),
            )
        )
    return parkings


def load(settings: Settings) -> list[Parking]:
    return parse(fetch(settings.madrid_parkings_url, settings).json())
