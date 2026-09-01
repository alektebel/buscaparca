import math

import pytest

from app.geo import (
    bearing_deg,
    capacity_from_geometry,
    destination_point,
    haversine_m,
    polyline_length_m,
    polyline_midpoint,
)

PUERTA_DEL_SOL = (-3.7038, 40.4168)
PLAZA_ESPANA = (-3.7124, 40.4238)


def test_haversine_matches_known_distance():
    # Sol -> Plaza de Espana son ~1,0 km en linea recta.
    assert haversine_m(PUERTA_DEL_SOL, PLAZA_ESPANA) == pytest.approx(1010, abs=60)


def test_haversine_is_symmetric_and_zero_on_itself():
    assert haversine_m(PUERTA_DEL_SOL, PLAZA_ESPANA) == pytest.approx(
        haversine_m(PLAZA_ESPANA, PUERTA_DEL_SOL)
    )
    assert haversine_m(PUERTA_DEL_SOL, PUERTA_DEL_SOL) == 0.0


@pytest.mark.parametrize("bearing", [0.0, 45.0, 90.0, 180.0, 270.0, 359.0])
def test_destination_point_round_trips(bearing):
    target = destination_point(PUERTA_DEL_SOL, bearing, 500.0)
    assert haversine_m(PUERTA_DEL_SOL, target) == pytest.approx(500.0, abs=0.5)
    assert bearing_deg(PUERTA_DEL_SOL, target) == pytest.approx(bearing, abs=0.5)


def test_polyline_midpoint_is_halfway_along_the_line_not_the_mean_of_vertices():
    # Tres vertices con el ultimo tramo mucho mas largo: la media de vertices caeria antes.
    a = PUERTA_DEL_SOL
    b = destination_point(a, 90.0, 100.0)
    c = destination_point(b, 90.0, 900.0)
    mid = polyline_midpoint([a, b, c])
    assert polyline_length_m([a, b, c]) == pytest.approx(1000.0, abs=1.0)
    assert haversine_m(a, mid) == pytest.approx(500.0, abs=1.0)


def test_capacity_discounts_blocked_kerb():
    # 200 m a un lado, descontando un tercio de bordillo perdido: ~23 plazas de 5,5 m.
    assert capacity_from_geometry(200.0, sides=1) == math.floor(200 * 0.65 / 5.5)
    assert capacity_from_geometry(200.0, sides=2) == math.floor(2 * 200 * 0.65 / 5.5)
    assert capacity_from_geometry(200.0, sides=0) == 0
    assert capacity_from_geometry(0.0, sides=2) == 0
