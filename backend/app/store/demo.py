"""Semilla de desarrollo: un trozo del centro de Madrid (Chueca, Malasana, Justicia).

Las calles son reales y los tipos de zona SER tambien, pero las coordenadas y las orientaciones son
**aproximadas** y las geometrias son rectas de dos puntos. Sirve para desarrollar el movil y para
las pruebas de humo; `make ingest` lo sustituye por la geometria real de OSM y las plazas reales
del dataset del SER.
"""

from __future__ import annotations

from app.domain import SER_AZUL, SER_VERDE, Parking, Segment
from app.geo import capacity_from_geometry, destination_point

# (nombre, lon, lat, rumbo, largo_m, lados_con_aparcamiento, zona_ser, POIs por 100 m)
_STREETS: tuple[tuple[str, float, float, float, float, int, str | None, float], ...] = (
    ("Calle de Fuencarral", -3.7013, 40.4256, 2.0, 300.0, 1, SER_AZUL, 6.0),
    ("Calle de Hortaleza", -3.6985, 40.4235, 10.0, 300.0, 1, SER_AZUL, 5.0),
    ("Calle del Barquillo", -3.6955, 40.4230, 15.0, 280.0, 1, SER_AZUL, 4.0),
    ("Calle de Augusto Figueroa", -3.6975, 40.4222, 95.0, 220.0, 1, SER_AZUL, 5.0),
    ("Calle de Pelayo", -3.6971, 40.4245, 5.0, 260.0, 1, SER_AZUL, 4.0),
    ("Calle de Gravina", -3.6968, 40.4227, 95.0, 180.0, 1, SER_AZUL, 4.0),
    ("Calle de San Lucas", -3.6979, 40.4237, 95.0, 140.0, 1, SER_AZUL, 3.0),
    ("Calle de la Libertad", -3.6968, 40.4213, 10.0, 200.0, 1, SER_AZUL, 5.0),
    ("Calle del Almirante", -3.6944, 40.4222, 100.0, 200.0, 1, SER_AZUL, 3.0),
    ("Calle del Espiritu Santo", -3.7043, 40.4249, 95.0, 230.0, 1, SER_VERDE, 5.0),
    ("Calle de la Palma", -3.7050, 40.4262, 95.0, 320.0, 1, SER_VERDE, 4.0),
    ("Calle del Pez", -3.7048, 40.4232, 100.0, 240.0, 1, SER_VERDE, 4.0),
    ("Calle de San Bernardo", -3.7060, 40.4265, 5.0, 350.0, 2, SER_AZUL, 3.0),
    ("Calle de Sagasta", -3.6975, 40.4290, 100.0, 300.0, 2, SER_VERDE, 2.0),
    ("Calle de Genova", -3.6947, 40.4265, 110.0, 250.0, 2, SER_AZUL, 2.0),
    ("Calle de Santa Engracia", -3.6975, 40.4320, 5.0, 400.0, 2, SER_VERDE, 2.0),
    ("Calle de Barcelo", -3.7005, 40.4275, 100.0, 200.0, 1, SER_AZUL, 3.0),
    ("Calle de Belen", -3.6960, 40.4245, 95.0, 150.0, 1, SER_AZUL, 3.0),
    ("Calle de Colon", -3.7005, 40.4258, 95.0, 170.0, 1, SER_AZUL, 4.0),
    ("Calle de Fernando VI", -3.6960, 40.4256, 100.0, 220.0, 1, SER_AZUL, 3.0),
    ("Calle de Hernan Cortes", -3.6988, 40.4248, 95.0, 160.0, 1, SER_AZUL, 4.0),
    ("Calle del Divino Pastor", -3.7040, 40.4270, 95.0, 210.0, 1, SER_VERDE, 3.0),
)

# Aparcamientos rotacionales de la zona. Tarifas aproximadas; la ingesta trae las reales.
_PARKINGS: tuple[tuple[str, float, float, int, float], ...] = (
    ("Parking Plaza del Rey", -3.6968, 40.4197, 320, 3.30),
    ("Parking Mercado de Barcelo", -3.7003, 40.4276, 280, 2.95),
    ("Parking Plaza de Santa Barbara", -3.6960, 40.4272, 240, 3.10),
    ("Parking Plaza de la Luna", -3.7053, 40.4222, 200, 3.20),
    ("Parking Plaza de Colon", -3.6899, 40.4256, 480, 3.60),
)


def demo_segments() -> list[Segment]:
    segments: list[Segment] = []
    for name, lon, lat, bearing, length, sides, zone, poi in _STREETS:
        centre = (lon, lat)
        start = destination_point(centre, (bearing + 180.0) % 360.0, length / 2.0)
        end = destination_point(centre, bearing, length / 2.0)
        segments.append(
            Segment(
                id=f"demo:{name.lower().replace(' ', '-')}",
                name=name,
                geometry=[start, end],
                length_m=length,
                capacity=capacity_from_geometry(length, sides),
                ser_zone=zone,
                poi_density=poi,
                barrio="Justicia/Universidad",
            )
        )
    return segments


def demo_parkings() -> list[Parking]:
    return [
        Parking(
            id=f"demo:{name.lower().replace(' ', '-')}",
            name=name,
            location=(lon, lat),
            total_spaces=total,
            rate_eur_h=rate,
            free_spaces=None,
        )
        for name, lon, lat, total, rate in _PARKINGS
    ]
