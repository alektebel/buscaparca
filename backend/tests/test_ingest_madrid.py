"""Los conectores contra ejemplares del formato documentado de cada portal.

Aviso importante: estos ejemplares estan **escritos a mano** siguiendo el formato documentado, no
grabados del portal (el entorno donde se escribio esto no tiene salida a datos.madrid.es). Cubren
que el parseo aguanta lo que se espera, no que los nombres de campo del portal sean hoy esos. La
primera vez que corras la ingesta de verdad, usa `python -m app.ingest.run inspect <url>`, compara,
y sustituye estos ficheros por respuestas grabadas.
"""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.domain import SER_AZUL, SER_LARGA, SER_VERDE
from app.ingest.madrid import parkings, ser, trafico

FIXTURES = Path(__file__).parent / "fixtures"


def test_parses_parkings_with_live_occupancy():
    found = parkings.parse(
        __import__("json").loads((FIXTURES / "aparcamientos.json").read_text()),
        now=datetime(2026, 9, 1, tzinfo=UTC),
    )

    assert [p.name for p in found] == [
        "Aparcamiento Plaza del Rey",
        "Aparcamiento Mercado de Barcelo",
    ], "un registro sin coordenadas no se puede usar y se descarta"

    rey = found[0]
    assert rey.location == (-3.6968, 40.4197)
    assert rey.total_spaces == 320
    assert rey.free_spaces == 47
    assert rey.rate_eur_h == pytest.approx(3.30), "la tarifa viene con coma decimal"
    assert rey.has_room


def test_a_full_car_park_is_not_a_fallback():
    found = parkings.parse(__import__("json").loads((FIXTURES / "aparcamientos.json").read_text()))
    barcelo = found[1]
    assert barcelo.free_spaces == 0
    assert not barcelo.has_room


def test_missing_rate_falls_back_to_a_reference_price():
    found = parkings.parse(__import__("json").loads((FIXTURES / "aparcamientos.json").read_text()))
    assert found[1].rate_eur_h == parkings.DEFAULT_RATE_EUR_H


def test_parses_traffic_and_reprojects_to_wgs84():
    readings = trafico.parse((FIXTURES / "pm.xml").read_text())

    assert len(readings) == 2, "las espiras sin coordenadas se descartan"
    first = readings[0]
    assert first.point_id == "madrid:pm:1001"
    lon, lat = first.location
    assert -3.75 < lon < -3.65, "UTM 30N mal reproyectado"
    assert 40.35 < lat < 40.50
    assert first.intensity == 1240


def test_traffic_pressure_prefers_load_then_occupancy():
    readings = trafico.parse((FIXTURES / "pm.xml").read_text())
    assert readings[0].pressure == pytest.approx(0.88), "usa 'carga' cuando la hay"
    assert readings[1].pressure == pytest.approx(0.09), "y si no, la ocupacion"


def test_parses_ser_streets_and_adds_up_their_spaces():
    streets = {s.key: s for s in ser.parse((FIXTURES / "ser.csv").read_text())}

    fuencarral = streets[ser.normalise("FUENCARRAL, CALLE DE")]
    assert fuencarral.spaces == 21, "una calle aparece por tramos y hay que sumarla"
    assert fuencarral.zone == SER_AZUL
    assert fuencarral.barrio == "JUSTICIA"
    assert streets[ser.normalise("PALMA, CALLE DE LA")].zone == SER_VERDE
    assert streets[ser.normalise("SAGASTA, CALLE DE")].zone == SER_LARGA
    assert ser.normalise("SIN PLAZAS, CALLE DE") not in streets, "sin plazas no aporta nada"


@pytest.mark.parametrize(
    ("municipal", "osm"),
    [
        ("FUENCARRAL, CALLE DE", "Calle de Fuencarral"),
        ("PALMA, CALLE DE LA", "Calle de la Palma"),
        ("ESPIRITU SANTO, CALLE DEL", "Calle del Espiritu Santo"),
        ("SAGASTA, CALLE DE", "Calle de Sagasta"),
    ],
)
def test_street_names_from_the_two_worlds_cross_match(municipal, osm):
    """El padron escribe 'FUENCARRAL, CALLE DE' y OSM 'Calle de Fuencarral'. Tienen que cruzar."""
    assert ser.normalise(municipal) == ser.normalise(osm)


def test_unrelated_streets_do_not_collide():
    assert ser.normalise("Calle de Alcala") != ser.normalise("Calle de Alcalde Sainz de Baranda")


def test_rejects_a_csv_without_the_columns_it_needs():
    with pytest.raises(ValueError, match="SER"):
        ser.parse("foo;bar\n1;2\n")
