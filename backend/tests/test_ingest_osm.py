"""Partido del callejero en tramos y cruce con las plazas del SER."""

import pytest

from app.geo import destination_point, polyline_length_m
from app.ingest.join import apply_ser
from app.ingest.madrid.ser import SerStreet, normalise
from app.ingest.osm import DEFAULT_SIDES, parking_sides, split_into_segments

ORIGIN = (-3.7013, 40.4256)


def straight_way(way_id: int, node_ids: list[int], name: str, tags=None, spacing_m: float = 100.0):
    """Una via recta hacia el norte con un nodo cada `spacing_m`."""
    geometry = [
        {
            "lon": destination_point(ORIGIN, 0.0, i * spacing_m)[0],
            "lat": destination_point(ORIGIN, 0.0, i * spacing_m)[1],
        }
        for i in range(len(node_ids))
    ]
    return {
        "type": "way",
        "id": way_id,
        "nodes": node_ids,
        "geometry": geometry,
        "tags": {"highway": "residential", "name": name, **(tags or {})},
    }


def test_splits_a_way_at_its_intersections():
    """Una calle de 400 m es inutil como unidad de prediccion: arriba y abajo no se parecen."""
    main = straight_way(1, [10, 11, 12, 13, 14], "Calle de Fuencarral")
    crossing = {
        "type": "way",
        "id": 2,
        "nodes": [20, 12, 21],  # cruza por el nodo 12
        "geometry": [
            {"lon": -3.702, "lat": 40.4265},
            {"lon": -3.7013, "lat": 40.4265},
            {"lon": -3.7005, "lat": 40.4265},
        ],
        "tags": {"highway": "residential", "name": "Calle de Colon"},
    }

    segments = split_into_segments([main, crossing])
    fuencarral = [s for s in segments if s.name == "Calle de Fuencarral"]

    assert len(fuencarral) == 2, "se corta en el cruce, y solo ahi"
    assert {round(s.length_m) for s in fuencarral} == {200}


def test_does_not_split_at_plain_geometry_nodes():
    segments = split_into_segments([straight_way(1, [10, 11, 12], "Calle sin cruces")])
    assert len(segments) == 1
    assert segments[0].length_m == pytest.approx(200.0, abs=1.0)


def test_drops_stubs_too_short_to_park_in():
    tiny = straight_way(1, [10, 11], "Callejon", spacing_m=8.0)
    assert split_into_segments([tiny]) == []


def test_segment_geometry_is_preserved():
    segments = split_into_segments([straight_way(1, [10, 11, 12], "Calle recta")])
    assert polyline_length_m(segments[0].geometry) == pytest.approx(segments[0].length_m)


@pytest.mark.parametrize(
    ("tags", "expected"),
    [
        ({"parking:both": "lane"}, 2),
        ({"parking:both": "no"}, 0),
        ({"parking:left": "lane", "parking:right": "no"}, 1),
        ({"parking:lane:both": "parallel"}, 2),
        ({"parking:lane:left": "no", "parking:lane:right": "no"}, 0),
        ({"highway": "residential"}, DEFAULT_SIDES["residential"]),
        ({"highway": "secondary"}, DEFAULT_SIDES["secondary"]),
    ],
)
def test_reads_which_kerbs_allow_parking(tags, expected):
    assert parking_sides(tags) == expected


def test_ser_spaces_are_shared_out_along_the_street():
    """OSM sabe donde estan las calles; el SER cuantas plazas tienen. Ninguno basta solo."""
    long_way = straight_way(1, [10, 11, 12, 13, 14], "Calle de Fuencarral")
    crossing = {
        "type": "way",
        "id": 2,
        "nodes": [20, 12, 21],
        "geometry": [
            {"lon": -3.702, "lat": 40.4265},
            {"lon": -3.7013, "lat": 40.4265},
            {"lon": -3.7005, "lat": 40.4265},
        ],
        "tags": {"highway": "residential", "name": "Otra"},
    }
    segments = split_into_segments([long_way, crossing])
    street = SerStreet(
        name="FUENCARRAL, CALLE DE",
        key=normalise("FUENCARRAL, CALLE DE"),
        zone="azul",
        spaces=40,
        barrio="JUSTICIA",
        distrito="CENTRO",
    )

    enriched, matched = apply_ser(segments, [street])
    fuencarral = [s for s in enriched if s.name == "Calle de Fuencarral"]

    assert matched == 1
    assert sum(s.capacity for s in fuencarral) == 40, "no se pierden ni se inventan plazas"
    assert all(s.ser_zone == "azul" and s.barrio == "JUSTICIA" for s in fuencarral)


def test_streets_outside_the_ser_keep_their_geometric_estimate():
    segments = split_into_segments([straight_way(1, [10, 11, 12], "Calle de las Afueras")])
    before = segments[0].capacity

    enriched, matched = apply_ser(segments, [])

    assert matched == 0
    assert enriched[0].capacity == before
    assert enriched[0].ser_zone is None
