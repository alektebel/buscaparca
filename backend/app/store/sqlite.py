"""Store persistente sobre SQLite.

Un callejero municipal completo cabe de sobra en SQLite (Madrid son ~10^5 tramos), las consultas
son por caja y los eventos son append-only. Se indexa por celda de ~500 m en vez de usar un indice
espacial de verdad: para una ciudad es mas que suficiente y evita arrastrar PostGIS al desarrollo.
Cuando haga falta escritura concurrente de varios ingestores, `infra/schema.sql` tiene el mismo
modelo para PostgreSQL/PostGIS.
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path

from app.config import Settings
from app.domain import ParkEvent, Parking, Segment, SegmentStats, TimeContext
from app.geo import Point, haversine_m
from app.model.posterior import decay_weight

CELL_DEG = 0.005  # ~500 m

SCHEMA = """
CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    geometry TEXT NOT NULL,          -- GeoJSON LineString coordinates
    length_m REAL NOT NULL,
    capacity INTEGER NOT NULL,
    ser_zone TEXT,
    poi_density REAL NOT NULL DEFAULT 0,
    barrio TEXT,
    lon REAL NOT NULL,               -- centroide, para consultar por caja
    lat REAL NOT NULL,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS segments_cell ON segments (cell_x, cell_y);

CREATE TABLE IF NOT EXISTS parkings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lon REAL NOT NULL,
    lat REAL NOT NULL,
    total_spaces INTEGER NOT NULL,
    rate_eur_h REAL NOT NULL,
    free_spaces INTEGER,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS traffic (
    point_id TEXT NOT NULL,
    lon REAL NOT NULL,
    lat REAL NOT NULL,
    pressure REAL NOT NULL,
    at TEXT NOT NULL,
    PRIMARY KEY (point_id, at)
);
CREATE INDEX IF NOT EXISTS traffic_at ON traffic (at);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    at TEXT NOT NULL,
    day_type TEXT NOT NULL,
    hour INTEGER NOT NULL,
    exposure_min REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS events_bucket ON events (segment_id, day_type, hour);
"""


def _cell(point: Point) -> tuple[int, int]:
    return (int(point[0] / CELL_DEG), int(point[1] / CELL_DEG))


class SqliteStore:
    def __init__(self, settings: Settings, path: str | Path) -> None:
        self.settings = settings
        self.path = str(path)
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    # ---------------------------------------------------------------- escritura

    def upsert_segments(self, segments: Iterable[Segment]) -> int:
        rows = []
        for s in segments:
            lon, lat = s.centroid
            cx, cy = _cell((lon, lat))
            rows.append(
                (
                    s.id,
                    s.name,
                    json.dumps(s.geometry),
                    s.length_m,
                    s.capacity,
                    s.ser_zone,
                    s.poi_density,
                    s.barrio,
                    lon,
                    lat,
                    cx,
                    cy,
                )
            )
        self.conn.executemany(
            "INSERT INTO segments VALUES (?,?,?,?,?,?,?,?,?,?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, geometry=excluded.geometry, "
            "length_m=excluded.length_m, capacity=excluded.capacity, ser_zone=excluded.ser_zone, "
            "poi_density=excluded.poi_density, barrio=excluded.barrio, lon=excluded.lon, "
            "lat=excluded.lat, cell_x=excluded.cell_x, cell_y=excluded.cell_y",
            rows,
        )
        self.conn.commit()
        return len(rows)

    def upsert_parkings(self, parkings: Iterable[Parking]) -> int:
        rows = [
            (
                p.id,
                p.name,
                p.location[0],
                p.location[1],
                p.total_spaces,
                p.rate_eur_h,
                p.free_spaces,
                p.updated_at.isoformat() if p.updated_at else None,
            )
            for p in parkings
        ]
        self.conn.executemany(
            "INSERT INTO parkings VALUES (?,?,?,?,?,?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, lon=excluded.lon, lat=excluded.lat, "
            "total_spaces=excluded.total_spaces, rate_eur_h=excluded.rate_eur_h, "
            "free_spaces=excluded.free_spaces, updated_at=excluded.updated_at",
            rows,
        )
        self.conn.commit()
        return len(rows)

    def record_traffic(self, readings: Iterable[tuple[str, Point, float, datetime]]) -> int:
        rows = [(pid, p[0], p[1], pressure, at.isoformat()) for pid, p, pressure, at in readings]
        self.conn.executemany("INSERT INTO traffic VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING", rows)
        self.conn.commit()
        return len(rows)

    def record_events(self, events: list[ParkEvent]) -> int:
        rows = []
        for e in events:
            day_type, hour = TimeContext(when=e.at).bucket
            rows.append((e.segment_id, e.kind, e.at.isoformat(), day_type, hour, e.exposure_min))
        self.conn.executemany(
            "INSERT INTO events (segment_id, kind, at, day_type, hour, exposure_min) "
            "VALUES (?,?,?,?,?,?)",
            rows,
        )
        self.conn.commit()
        return len(rows)

    # ---------------------------------------------------------------- lectura

    def _segment(self, row: sqlite3.Row) -> Segment:
        return Segment(
            id=row["id"],
            name=row["name"],
            geometry=[tuple(p) for p in json.loads(row["geometry"])],
            length_m=row["length_m"],
            capacity=row["capacity"],
            ser_zone=row["ser_zone"],
            poi_density=row["poi_density"],
            barrio=row["barrio"],
        )

    def segments_in_bbox(self, bbox: tuple[float, float, float, float]) -> list[Segment]:
        rows = self.conn.execute(
            "SELECT * FROM segments WHERE lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?",
            (bbox[0], bbox[2], bbox[1], bbox[3]),
        ).fetchall()
        return [self._segment(r) for r in rows]

    def segments_near(self, point: Point, radius_m: float) -> list[Segment]:
        # Una caja generosa por celdas y luego el filtro exacto por distancia.
        pad = radius_m / 111_000.0 * 1.6
        rows = self.conn.execute(
            "SELECT * FROM segments WHERE lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?",
            (point[0] - pad, point[0] + pad, point[1] - pad, point[1] + pad),
        ).fetchall()
        out = []
        for row in rows:
            if haversine_m(point, (row["lon"], row["lat"])) <= radius_m:
                out.append(self._segment(row))
        return out

    def parkings_near(self, point: Point, radius_m: float) -> list[Parking]:
        pad = radius_m / 111_000.0 * 1.6
        rows = self.conn.execute(
            "SELECT * FROM parkings WHERE lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?",
            (point[0] - pad, point[0] + pad, point[1] - pad, point[1] + pad),
        ).fetchall()
        out = []
        for row in rows:
            location = (row["lon"], row["lat"])
            if haversine_m(point, location) > radius_m:
                continue
            out.append(
                Parking(
                    id=row["id"],
                    name=row["name"],
                    location=location,
                    total_spaces=row["total_spaces"],
                    rate_eur_h=row["rate_eur_h"],
                    free_spaces=row["free_spaces"],
                    updated_at=(
                        datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else None
                    ),
                )
            )
        return out

    def stats_for(
        self, segment_ids: list[str], bucket: tuple[str, int], now: datetime
    ) -> dict[str, SegmentStats]:
        out = {sid: SegmentStats() for sid in segment_ids}
        if not segment_ids:
            return out
        day_type, hour = bucket
        placeholders = ",".join("?" * len(segment_ids))
        rows = self.conn.execute(
            f"SELECT segment_id, kind, at, exposure_min FROM events "  # noqa: S608 - ids propios
            f"WHERE day_type = ? AND hour = ? AND segment_id IN ({placeholders})",
            (day_type, hour, *segment_ids),
        ).fetchall()

        halflife = self.settings.posterior_halflife_days
        for row in rows:
            at = datetime.fromisoformat(row["at"])
            weight = decay_weight((now - at).total_seconds() / 86400.0, halflife)
            stats = out[row["segment_id"]]
            if row["kind"] == "park":
                stats.found += weight
                stats.exposure_min += weight * row["exposure_min"]
            elif row["kind"] == "cruise_no_spot":
                stats.missed += weight
                stats.exposure_min += weight * row["exposure_min"]
            elif row["kind"] == "unpark":
                stats.unparks += weight
        return out

    def traffic_pressure(self, point: Point, when: datetime, radius_m: float = 800.0) -> float:
        """Media de las espiras cercanas en la lectura mas reciente que tengamos."""
        pad = radius_m / 111_000.0 * 1.6
        row = self.conn.execute(
            "SELECT AVG(pressure) AS p FROM traffic WHERE at = (SELECT MAX(at) FROM traffic) "
            "AND lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?",
            (point[0] - pad, point[0] + pad, point[1] - pad, point[1] + pad),
        ).fetchone()
        if row and row["p"] is not None:
            return float(row["p"])
        from app.store.memory import default_traffic_pressure

        return default_traffic_pressure(when)

    def close(self) -> None:
        self.conn.close()


def utcnow() -> datetime:
    return datetime.now(UTC)
