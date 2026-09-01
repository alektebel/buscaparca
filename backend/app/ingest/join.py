"""Cruce SER x OSM: geometria de OSM + plazas reales del Ayuntamiento.

OSM sabe donde estan las calles; el SER sabe cuantas plazas tiene cada una y de que color. Ninguno
de los dos basta: la capacidad deducida de la geometria sobreestima mucho en el centro, y el SER no
trae geometria utilizable por tramos. Se reparten las plazas de la calle entre sus tramos en
proporcion a la longitud.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import replace

from app.domain import Segment
from app.ingest.madrid.ser import SerStreet, normalise


def apply_ser(segments: list[Segment], streets: list[SerStreet]) -> tuple[list[Segment], int]:
    """Devuelve los tramos enriquecidos y cuantas calles del SER se han podido cruzar."""
    by_key = {s.key: s for s in streets}
    grouped: dict[str, list[Segment]] = defaultdict(list)
    for segment in segments:
        grouped[normalise(segment.name)].append(segment)

    out: list[Segment] = []
    matched = 0
    for key, group in grouped.items():
        street = by_key.get(key)
        if street is None:
            out.extend(group)
            continue
        matched += 1
        total_length = sum(s.length_m for s in group) or 1.0
        for segment in group:
            share = segment.length_m / total_length
            out.append(
                replace(
                    segment,
                    capacity=max(0, round(street.spaces * share)),
                    ser_zone=street.zone,
                    barrio=street.barrio,
                )
            )
    return out, matched
