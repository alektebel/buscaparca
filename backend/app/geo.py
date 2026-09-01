"""Utilidades geometricas minimas: sin dependencias pesadas, todo en WGS84."""

from __future__ import annotations

import math

EARTH_RADIUS_M = 6_371_000.0
Point = tuple[float, float]  # (lon, lat)


def haversine_m(a: Point, b: Point) -> float:
    """Distancia en metros entre dos puntos (lon, lat)."""
    lon1, lat1 = math.radians(a[0]), math.radians(a[1])
    lon2, lat2 = math.radians(b[0]), math.radians(b[1])
    dlon, dlat = lon2 - lon1, lat2 - lat1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(h)))


def bearing_deg(origin: Point, target: Point) -> float:
    """Rumbo desde origin hacia target, en grados [0, 360)."""
    lon1, lat1 = math.radians(origin[0]), math.radians(origin[1])
    lon2, lat2 = math.radians(target[0]), math.radians(target[1])
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def polyline_length_m(points: list[Point]) -> float:
    return sum(haversine_m(a, b) for a, b in zip(points, points[1:], strict=False))


def polyline_midpoint(points: list[Point]) -> Point:
    """Punto a mitad de recorrido de la polilinea (no la media de los vertices)."""
    if not points:
        raise ValueError("polilinea vacia")
    if len(points) == 1:
        return points[0]
    half = polyline_length_m(points) / 2.0
    run = 0.0
    for a, b in zip(points, points[1:], strict=False):
        d = haversine_m(a, b)
        if run + d >= half:
            t = 0.0 if d == 0 else (half - run) / d
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        run += d
    return points[-1]


def bbox_contains(bbox: tuple[float, float, float, float], p: Point) -> bool:
    min_lon, min_lat, max_lon, max_lat = bbox
    return min_lon <= p[0] <= max_lon and min_lat <= p[1] <= max_lat


# Longitud media que ocupa un coche aparcado en linea, incluyendo el hueco de maniobra.
CAR_SLOT_M = 5.5


def capacity_from_geometry(length_m: float, sides: int, blocked_fraction: float = 0.35) -> int:
    """Plazas estimadas en un tramo.

    `sides` es cuantos lados admiten estacionamiento (0, 1 o 2). `blocked_fraction`
    descuenta vados, contenedores, paradas de bus y esquinas: en calle urbana real se pierde en
    torno a un tercio del bordillo.
    """
    if sides <= 0 or length_m <= 0:
        return 0
    usable = length_m * sides * (1.0 - blocked_fraction)
    return max(0, int(usable // CAR_SLOT_M))


def destination_point(origin: Point, bearing: float, distance_m: float) -> Point:
    """Punto a `distance_m` de `origin` con rumbo `bearing`. Formula directa de Vincenty."""
    br = math.radians(bearing)
    lon1, lat1 = math.radians(origin[0]), math.radians(origin[1])
    ang = distance_m / EARTH_RADIUS_M
    lat2 = math.asin(math.sin(lat1) * math.cos(ang) + math.cos(lat1) * math.sin(ang) * math.cos(br))
    lon2 = lon1 + math.atan2(
        math.sin(br) * math.sin(ang) * math.cos(lat1),
        math.cos(ang) - math.sin(lat1) * math.sin(lat2),
    )
    return (math.degrees(lon2), math.degrees(lat2))
