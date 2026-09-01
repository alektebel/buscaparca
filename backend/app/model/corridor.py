"""Construccion del corredor de busqueda alrededor del destino.

El conductor real no recorre una ruta optima de grafo: va al portal y empieza a abrir la espiral.
Eso es lo que se genera aqui, con un encadenado voraz de manzana en manzana que penaliza volver
hacia dentro. Ordenar de dentro afuera importa: hace que los primeros candidatos sean los mejores
(los mas cercanos) y que el umbral de aceptacion se vaya relajando conforme te alejas, que es
justo el comportamiento que uno quiere de la app.

`travel_time_fn` esta inyectado para poder cambiar la estimacion euclidea por OSRM/Valhalla sin
tocar el resto.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import replace

from app.config import Settings
from app.domain import Parking, Segment
from app.geo import Point, haversine_m
from app.model.availability import Availability
from app.model.stopping import Candidate, Fallback

TravelTimeFn = Callable[[Point, Point], float]


def euclidean_travel_time(settings: Settings) -> TravelTimeFn:
    """Minutos de conduccion entre dos puntos, con factor de rodeo por el callejero."""
    speed_m_per_min = settings.cruise_speed_kmh * 1000.0 / 60.0

    def travel(a: Point, b: Point) -> float:
        return haversine_m(a, b) * settings.detour_factor / speed_m_per_min

    return travel


def walking_minutes(distance_m: float, settings: Settings) -> float:
    return distance_m * settings.detour_factor / (settings.walk_speed_kmh * 1000.0 / 60.0)


def order_cruise_path(
    destination: Point, segments: Iterable[Segment], ring_m: float = 150.0
) -> list[Segment]:
    """Ordena los tramos como los recorreria un conductor de verdad.

    Dos reglas, y las dos importan:

    * **De dentro afuera, por anillos.** Empiezas en el portal y vas abriendo. Asi los primeros
      candidatos son los mejores y el umbral de aceptacion se relaja segun te alejas, que es el
      comportamiento que uno quiere de la app. Sin esto el corredor sale y vuelve, y el DP evalua
      un recorrido que nadie haria.
    * **Dentro de cada anillo, al mas cercano.** Los saltos son de manzana y no de barrio, asi que
      el coste de "seguir buscando" que ve el DP es el real y no uno inflado.
    """
    pool = list(segments)
    if not pool:
        return []

    to_dest = {s.id: haversine_m(destination, s.centroid) for s in pool}
    rings: dict[int, list[Segment]] = {}
    for segment in pool:
        rings.setdefault(int(to_dest[segment.id] // ring_m), []).append(segment)

    path: list[Segment] = []
    cursor = destination
    for ring in sorted(rings):
        remaining = rings[ring]
        while remaining:
            nearest = min(remaining, key=lambda s, c=cursor: haversine_m(c, s.centroid))
            remaining.remove(nearest)
            path.append(nearest)
            cursor = nearest.centroid
    return path


def build_corridor(
    destination: Point,
    segments: list[Segment],
    availability: dict[str, Availability],
    settings: Settings,
    stay_hours: float,
    fallback_location: Point | None,
    travel_time: TravelTimeFn | None = None,
) -> list[Candidate]:
    """Convierte tramos + probabilidades en la secuencia ordenada que consume el DP."""
    travel = travel_time or euclidean_travel_time(settings)
    ordered = order_cruise_path(destination, segments)[: settings.max_corridor_segments]

    candidates: list[Candidate] = []
    for i, segment in enumerate(ordered):
        avail = availability.get(segment.id)
        if avail is None or avail.capacity <= 0:
            continue
        centroid = segment.centroid
        walk_m = haversine_m(centroid, destination)

        # El ultimo del corredor conduce hasta el parking de respaldo; el resto, al siguiente tramo.
        if i + 1 < len(ordered):
            next_point = ordered[i + 1].centroid
        else:
            next_point = fallback_location or destination
        candidates.append(
            Candidate(
                segment_id=segment.id,
                label=segment.name,
                p_free=avail.p_free,
                walk_min=walking_minutes(walk_m, settings),
                price_eur=segment.ser_rate_eur_h * stay_hours,
                drive_min_to_next=travel(centroid, next_point),
                drive_min_to_fallback=(
                    travel(centroid, fallback_location) if fallback_location else 12.0
                ),
                confidence=avail.confidence,
            )
        )

    # El ultimo candidato real siempre desemboca en el parking de respaldo, aunque tras el queden
    # tramos sin plazas: si el corredor se agota, es alli donde acabas.
    if candidates and fallback_location is not None:
        last = candidates[-1]
        last_centroid = next(s.centroid for s in ordered if s.id == last.segment_id)
        candidates[-1] = replace(last, drive_min_to_next=travel(last_centroid, fallback_location))
    return candidates


def choose_fallback(
    destination: Point, parkings: list[Parking], settings: Settings, stay_hours: float
) -> tuple[Fallback, Point | None]:
    """Elige el parking de respaldo: el mas barato en coste total (andar + tarifa) con sitio."""
    usable = [p for p in parkings if p.has_room]
    if not usable:
        # Sin parking conocido no hay opcion terminal real: se penaliza fuerte para que el DP
        # entienda que quedarse sin corredor es malo, en vez de fingir que hay una salida comoda.
        return Fallback(
            id="none", label="sin parking conocido", walk_min=25.0, price_eur=12.0
        ), None

    def total_cost(p: Parking) -> float:
        walk = walking_minutes(haversine_m(destination, p.location), settings)
        return walk * 0.5 + p.rate_eur_h * stay_hours

    best = min(usable, key=total_cost)
    return (
        Fallback(
            id=best.id,
            label=best.name,
            walk_min=walking_minutes(haversine_m(destination, best.location), settings),
            price_eur=best.rate_eur_h * stay_hours,
        ),
        best.location,
    )
