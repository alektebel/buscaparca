"""CLI de ingesta.

    python -m app.ingest.run all         # callejero + SER + parkings + trafico
    python -m app.ingest.run calles      # OSM + SER (lento: una sola vez, o cuando cambie el SER)
    python -m app.ingest.run parkings    # cada 5 min
    python -m app.ingest.run trafico     # cada 5 min
    python -m app.ingest.run inspect URL # imprime la forma real del payload

`inspect` existe porque los esquemas de los portales municipales cambian entre versiones y los
conectores extraen por nombre de clave. Antes de fiarte de una serie temporal, mira lo que el
portal esta devolviendo hoy.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime

from app.config import Settings, get_settings
from app.ingest import osm
from app.ingest.http import fetch
from app.ingest.join import apply_ser
from app.ingest.madrid import parkings as parkings_source
from app.ingest.madrid import ser as ser_source
from app.ingest.madrid import trafico as trafico_source
from app.store.sqlite import SqliteStore


def _store(settings: Settings) -> SqliteStore:
    if not settings.sqlite_path:
        raise SystemExit(
            "define BUSCAPARCA_SQLITE_PATH (p. ej. BUSCAPARCA_SQLITE_PATH=../data/buscaparca.db)"
        )
    return SqliteStore(settings, settings.sqlite_path)


def ingest_streets(settings: Settings) -> None:
    """Callejero: geometria de OSM, plazas reales del SER, densidad de POIs."""
    print(f"OSM: descargando el callejero de {settings.city}...", flush=True)
    ways = osm.fetch_ways(settings, settings.city_bbox)
    segments = osm.split_into_segments(ways)
    print(f"OSM: {len(ways)} vias -> {len(segments)} tramos")

    print("OSM: POIs...", flush=True)
    segments = osm.attach_poi_density(segments, osm.fetch_pois(settings, settings.city_bbox))

    print("SER: plazas por calle...", flush=True)
    streets = ser_source.load(settings)
    segments, matched = apply_ser(segments, streets)
    print(f"SER: {len(streets)} calles, cruzadas con OSM: {matched}")

    written = _store(settings).upsert_segments(segments)
    total_capacity = sum(s.capacity for s in segments)
    print(f"guardados {written} tramos, {total_capacity} plazas estimadas")


def ingest_parkings(settings: Settings) -> None:
    found = parkings_source.load(settings)
    with_live = sum(1 for p in found if p.free_spaces is not None)
    _store(settings).upsert_parkings(found)
    print(f"parkings: {len(found)} guardados, {with_live} con ocupacion en vivo")
    if found and not with_live:
        print(
            "  aviso: ninguno trae plazas libres. Revisa FREE_KEYS en "
            "app/ingest/madrid/parkings.py "
            "con `python -m app.ingest.run inspect <url>`."
        )


def ingest_traffic(settings: Settings) -> None:
    readings = trafico_source.load(settings)
    now = datetime.now(UTC)
    _store(settings).record_traffic([(r.point_id, r.location, r.pressure, now) for r in readings])
    print(f"trafico: {len(readings)} espiras")


def inspect(settings: Settings, url: str) -> None:
    """Imprime la forma del payload para poder fijar los nombres de campo con datos delante."""
    response = fetch(url, settings)
    body = response.text
    print(f"HTTP {response.status_code} · {response.headers.get('content-type')} · {len(body)} B")
    try:
        payload = response.json()
    except ValueError:
        print(body[:2000])
        return

    def shape(node, depth=0, prefix=""):
        pad = "  " * depth
        if isinstance(node, dict):
            for key, value in list(node.items())[:40]:
                if isinstance(value, dict | list):
                    print(f"{pad}{prefix}{key}:")
                    if depth < 3:
                        shape(value, depth + 1)
                else:
                    print(f"{pad}{prefix}{key} = {json.dumps(value, ensure_ascii=False)[:80]}")
        elif isinstance(node, list):
            print(f"{pad}[{len(node)} elementos] primero:")
            if node and depth < 3:
                shape(node[0], depth + 1)

    shape(payload)


COMMANDS = {
    "calles": ingest_streets,
    "parkings": ingest_parkings,
    "trafico": ingest_traffic,
}


def main(argv: list[str]) -> int:
    settings = get_settings()
    if len(argv) < 2:
        print(__doc__)
        return 2

    command = argv[1]
    if command == "inspect":
        if len(argv) < 3:
            print("uso: python -m app.ingest.run inspect <url>")
            return 2
        inspect(settings, argv[2])
        return 0

    if command == "all":
        for name, run in COMMANDS.items():
            print(f"--- {name}")
            run(settings)
        return 0

    if command not in COMMANDS:
        print(f"comando desconocido: {command}")
        print(__doc__)
        return 2

    COMMANDS[command](settings)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
