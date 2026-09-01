"""Servicio de Estacionamiento Regulado: calles y numero de plazas (dataset 218228).

Es el dato mas valioso del arranque en frio: dice cuantas plazas hay de verdad en cada calle y de
que tipo (azul, verde, larga estancia, sanitaria). Sin el habria que deducir la capacidad de la
geometria, que sobreestima mucho en el centro (vados, contenedores, terrazas, carga y descarga).

CSV municipal: separador `;` y, casi siempre, codificacion latin-1.
"""

from __future__ import annotations

import csv
import io
import unicodedata
from dataclasses import dataclass

from app.config import Settings
from app.domain import SER_AZUL, SER_LARGA, SER_SANITARIA, SER_VERDE
from app.ingest.http import fetch, to_float

NAME_COLUMNS = ("nomvia", "calle", "nombrevia", "via", "nombre")
SPACES_COLUMNS = ("numplazas", "plazas", "numerodeplazas", "nplazas")
ZONE_COLUMNS = ("color", "tipo", "tipoplaza", "tipodeplaza", "categoria")
BARRIO_COLUMNS = ("barrio", "nombrebarrio")
DISTRITO_COLUMNS = ("distrito", "nombredistrito")

ZONE_BY_KEYWORD: tuple[tuple[str, str], ...] = (
    ("azul", SER_AZUL),
    ("verde", SER_VERDE),
    ("larga", SER_LARGA),
    ("sanitar", SER_SANITARIA),
)


@dataclass(frozen=True)
class SerStreet:
    name: str
    key: str  # nombre normalizado, para cruzar con OSM
    zone: str | None
    spaces: int
    barrio: str | None
    distrito: str | None


def normalise(name: str) -> str:
    """Clave de cruce: sin acentos, sin tipo de via y sin mayusculas.

    'CALLE DE FUENCARRAL' y 'Calle de Fuencarral' tienen que cruzar; y OSM escribe 'Calle de
    Fuencarral' mientras el padron municipal escribe 'FUENCARRAL, CALLE DE'.
    """
    text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    text = text.replace(",", " ")
    stop = {
        "calle",
        "de",
        "del",
        "la",
        "las",
        "los",
        "el",
        "plaza",
        "paseo",
        "avenida",
        "ronda",
        "glorieta",
        "travesia",
        "camino",
        "carretera",
        "cuesta",
        "costanilla",
    }
    words = [w for w in text.split() if w and w not in stop]
    return " ".join(sorted(words)) if words else text.strip()


def _column(headers: list[str], candidates: tuple[str, ...]) -> str | None:
    normalised = {h: h.lower().replace("_", "").replace(" ", "").replace(".", "") for h in headers}
    for header, key in normalised.items():
        if key in candidates:
            return header
    for header, key in normalised.items():
        if any(key.startswith(c) or c in key for c in candidates):
            return header
    return None


def _zone_from(value: str | None) -> str | None:
    if not value:
        return None
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    for keyword, zone in ZONE_BY_KEYWORD:
        if keyword in text:
            return zone
    return None


def parse(csv_text: str) -> list[SerStreet]:
    reader = csv.DictReader(io.StringIO(csv_text), delimiter=";")
    headers = list(reader.fieldnames or [])
    if not headers:
        return []

    name_col = _column(headers, NAME_COLUMNS)
    spaces_col = _column(headers, SPACES_COLUMNS)
    zone_col = _column(headers, ZONE_COLUMNS)
    barrio_col = _column(headers, BARRIO_COLUMNS)
    distrito_col = _column(headers, DISTRITO_COLUMNS)
    if not name_col or not spaces_col:
        raise ValueError(f"el CSV del SER no trae calle/plazas reconocibles: {headers}")

    # Una calle aparece en varias filas (un tramo por numero de finca): se agregan.
    merged: dict[str, SerStreet] = {}
    for row in reader:
        name = (row.get(name_col) or "").strip()
        spaces = to_float(row.get(spaces_col) or "")
        if not name or spaces is None:
            continue
        key = normalise(name)
        zone = _zone_from(row.get(zone_col) if zone_col else None)
        previous = merged.get(key)
        merged[key] = SerStreet(
            name=previous.name if previous else name,
            key=key,
            zone=(previous.zone if previous and previous.zone else zone),
            spaces=int(spaces) + (previous.spaces if previous else 0),
            barrio=(row.get(barrio_col) or "").strip() or None if barrio_col else None,
            distrito=(row.get(distrito_col) or "").strip() or None if distrito_col else None,
        )
    return list(merged.values())


def load(settings: Settings) -> list[SerStreet]:
    response = fetch(settings.madrid_ser_streets_url, settings)
    try:
        text = response.content.decode("latin-1")
    except UnicodeDecodeError:
        text = response.text
    return parse(text)
