"""OpenStreetMap via Overpass: la geometria de los tramos y de que lados se puede aparcar.

OSM aporta lo que ningun dato municipal da: el callejero partido en tramos reales y, cuando esta
mapeado, `parking:lane`/`parking:both`, que dice si el bordillo admite estacionamiento. La
capacidad definitiva sale de cruzar esto con las plazas reales del SER (`app.ingest.madrid.ser`);
la geometria solo se usa para repartirlas entre los tramos de la calle.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from app.config import Settings
from app.domain import Segment
from app.geo import Point, capacity_from_geometry, haversine_m, polyline_length_m
from app.ingest.http import fetch

# Vias donde tiene sentido buscar aparcamiento en linea.
CRUISABLE = ("residential", "living_street", "unclassified", "tertiary", "secondary", "pedestrian")
# Por defecto, cuantos lados admiten aparcamiento cuando OSM no lo dice. Es una suposicion, y esta
# aqui a proposito para que se vea: el cruce con el SER la corrige donde hay dato real.
DEFAULT_SIDES = {
    "residential": 1,
    "living_street": 1,
    "unclassified": 1,
    "tertiary": 1,
    "secondary": 0,
    "pedestrian": 0,
}
NO_PARKING_VALUES = {"no", "none", "separate", "no_parking", "no_stopping"}

POI_TAGS = ("bar", "restaurant", "cafe", "pub", "school", "cinema", "theatre", "nightclub")
POI_RADIUS_M = 60.0

WAYS_QUERY = """
[out:json][timeout:180];
way[highway~"^({kinds})$"][name]({south},{west},{north},{east});
out body geom;
"""

POIS_QUERY = """
[out:json][timeout:120];
(
  node[amenity~"^({tags})$"]({south},{west},{north},{east});
  way[office]({south},{west},{north},{east});
);
out center;
"""


def _bbox_args(bbox: tuple[float, float, float, float]) -> dict[str, float]:
    min_lon, min_lat, max_lon, max_lat = bbox
    return {"south": min_lat, "west": min_lon, "north": max_lat, "east": max_lon}


def parking_sides(tags: dict[str, str]) -> int:
    """Cuantos lados de la calle admiten aparcamiento, segun las etiquetas de OSM."""
    both = tags.get("parking:both") or tags.get("parking:lane:both")
    if both is not None:
        return 0 if both in NO_PARKING_VALUES else 2

    sides = 0
    seen = False
    for side in ("left", "right"):
        value = tags.get(f"parking:{side}") or tags.get(f"parking:lane:{side}")
        if value is None:
            continue
        seen = True
        if value not in NO_PARKING_VALUES:
            sides += 1
    if seen:
        return sides
    return DEFAULT_SIDES.get(tags.get("highway", ""), 1)


def split_into_segments(ways: list[dict[str, Any]], min_length_m: float = 25.0) -> list[Segment]:
    """Parte cada via en sus tramos entre intersecciones.

    Un `way` de OSM puede ser una calle entera de 800 m; como unidad de prediccion es inutil,
    porque la mitad de arriba y la de abajo no se parecen en nada. Se corta en los nodos que
    comparte con otras vias, que es donde el conductor puede realmente decidir.
    """
    node_uses: Counter[int] = Counter()
    for way in ways:
        for node_id in way.get("nodes", []):
            node_uses[node_id] += 1

    segments: list[Segment] = []
    for way in ways:
        geometry = way.get("geometry") or []
        node_ids = way.get("nodes") or []
        if len(geometry) < 2 or len(geometry) != len(node_ids):
            continue

        tags = way.get("tags") or {}
        name = tags.get("name") or "sin nombre"
        sides = parking_sides(tags)
        points: list[Point] = [(p["lon"], p["lat"]) for p in geometry]

        # Indices de corte: extremos mas cada nodo interior compartido con otra via.
        cuts = (
            [0]
            + [i for i in range(1, len(points) - 1) if node_uses[node_ids[i]] > 1]
            + [len(points) - 1]
        )

        for part, (start, end) in enumerate(zip(cuts, cuts[1:], strict=False)):
            piece = points[start : end + 1]
            length = polyline_length_m(piece)
            if length < min_length_m:
                continue
            segments.append(
                Segment(
                    id=f"osm:{way['id']}:{part}",
                    name=name,
                    geometry=piece,
                    length_m=length,
                    capacity=capacity_from_geometry(length, sides),
                )
            )
    return segments


def fetch_ways(settings: Settings, bbox: tuple[float, float, float, float]) -> list[dict[str, Any]]:
    query = WAYS_QUERY.format(kinds="|".join(CRUISABLE), **_bbox_args(bbox))
    response = fetch(settings.overpass_url, settings, params={"data": query})
    return [e for e in response.json().get("elements", []) if e.get("type") == "way"]


def fetch_pois(settings: Settings, bbox: tuple[float, float, float, float]) -> list[Point]:
    query = POIS_QUERY.format(tags="|".join(POI_TAGS), **_bbox_args(bbox))
    response = fetch(settings.overpass_url, settings, params={"data": query})
    points: list[Point] = []
    for element in response.json().get("elements", []):
        centre = element.get("center") or element
        if "lat" in centre and "lon" in centre:
            points.append((centre["lon"], centre["lat"]))
    return points


def attach_poi_density(segments: list[Segment], pois: list[Point]) -> list[Segment]:
    """POIs por cada 100 m de tramo. Rejilla de ~100 m para no hacer un producto cartesiano."""
    from dataclasses import replace

    cell = 0.0012  # ~100 m en latitud; en Madrid, ~100 m en longitud tambien
    grid: dict[tuple[int, int], list[Point]] = defaultdict(list)
    for lon, lat in pois:
        grid[(int(lon / cell), int(lat / cell))].append((lon, lat))

    out: list[Segment] = []
    for segment in segments:
        lon, lat = segment.centroid
        cx, cy = int(lon / cell), int(lat / cell)
        nearby = [
            p for dx in (-1, 0, 1) for dy in (-1, 0, 1) for p in grid.get((cx + dx, cy + dy), ())
        ]
        count = sum(1 for p in nearby if haversine_m(p, (lon, lat)) <= POI_RADIUS_M)
        density = count / max(segment.length_m / 100.0, 0.5)
        out.append(replace(segment, poi_density=density))
    return out
