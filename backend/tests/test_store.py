"""Los dos stores tienen que responder lo mismo: la API no debe notar cual hay debajo."""

from datetime import UTC, datetime, timedelta

import pytest

from app.domain import ParkEvent, Parking
from app.store.demo import demo_parkings, demo_segments
from app.store.memory import MemoryStore
from app.store.sqlite import SqliteStore

CHUECA = (-3.6975, 40.4245)
NOW = datetime(2026, 9, 3, 20, tzinfo=UTC)
BUCKET = ("laborable", 20)


@pytest.fixture(params=["memoria", "sqlite"])
def store(request, settings, tmp_path):
    if request.param == "memoria":
        return MemoryStore.with_demo_data(settings)
    sqlite_store = SqliteStore(settings, tmp_path / "test.db")
    sqlite_store.upsert_segments(demo_segments())
    sqlite_store.upsert_parkings(demo_parkings())
    return sqlite_store


def test_finds_segments_near_a_point(store):
    near = store.segments_near(CHUECA, 300.0)
    far = store.segments_near(CHUECA, 2000.0)

    assert 0 < len(near) < len(far)
    assert all(s.capacity >= 0 for s in near)


def test_bbox_and_radius_agree(store):
    inside = {s.id for s in store.segments_near(CHUECA, 200.0)}
    box = {s.id for s in store.segments_in_bbox((-3.705, 40.420, -3.690, 40.429))}
    assert inside <= box


def test_round_trips_geometry_and_attributes(store):
    segment = next(s for s in store.segments_near(CHUECA, 2000.0) if s.name == "Calle de Pelayo")

    assert len(segment.geometry) >= 2
    assert all(len(point) == 2 for point in segment.geometry)
    assert segment.ser_zone == "azul"
    assert segment.length_m == pytest.approx(260.0, abs=1.0)


def test_finds_parkings(store):
    assert any(p.name.startswith("Parking") for p in store.parkings_near(CHUECA, 1500.0))


def test_events_feed_the_posterior_and_decay(store):
    segment_id = store.segments_near(CHUECA, 2000.0)[0].id
    store.record_events(
        [
            ParkEvent(segment_id=segment_id, kind="park", at=NOW - timedelta(days=1)),
            ParkEvent(segment_id=segment_id, kind="unpark", at=NOW - timedelta(days=1)),
            ParkEvent(
                segment_id=segment_id,
                kind="cruise_no_spot",
                at=NOW - timedelta(days=1),
                exposure_min=2.0,
            ),
        ]
    )

    fresh = store.stats_for([segment_id], BUCKET, NOW)[segment_id]
    assert fresh.found == pytest.approx(1.0, abs=0.05)
    assert fresh.missed == pytest.approx(1.0, abs=0.05)
    assert fresh.unparks == pytest.approx(1.0, abs=0.05)
    assert fresh.exposure_min == pytest.approx(2.0, abs=0.1)

    # Un ano despues, esa evidencia ya no dice nada de como esta la calle hoy.
    stale = store.stats_for([segment_id], BUCKET, NOW + timedelta(days=365))[segment_id]
    assert stale.found < 0.001


def test_events_are_filed_by_time_bucket(store):
    segment_id = store.segments_near(CHUECA, 2000.0)[0].id
    store.record_events([ParkEvent(segment_id=segment_id, kind="park", at=NOW)])

    assert store.stats_for([segment_id], ("laborable", 20), NOW)[segment_id].found > 0
    assert store.stats_for([segment_id], ("laborable", 4), NOW)[segment_id].found == 0
    assert store.stats_for([segment_id], ("sabado", 20), NOW)[segment_id].found == 0


def test_traffic_pressure_has_a_daily_shape(store):
    quiet = store.traffic_pressure(CHUECA, datetime(2026, 9, 3, 4, tzinfo=UTC))
    rush = store.traffic_pressure(CHUECA, datetime(2026, 9, 3, 20, tzinfo=UTC))
    assert 0.0 <= quiet < rush <= 1.0


def test_sqlite_upserts_instead_of_duplicating(settings, tmp_path):
    store = SqliteStore(settings, tmp_path / "test.db")
    store.upsert_segments(demo_segments())
    store.upsert_segments(demo_segments())

    assert len(store.segments_near(CHUECA, 5000.0)) == len(demo_segments())


def test_sqlite_keeps_live_occupancy(settings, tmp_path):
    store = SqliteStore(settings, tmp_path / "test.db")
    store.upsert_parkings(
        [
            Parking(
                id="p1",
                name="Parking",
                location=CHUECA,
                total_spaces=100,
                rate_eur_h=3.0,
                free_spaces=0,
                updated_at=NOW,
            )
        ]
    )
    stored = store.parkings_near(CHUECA, 100.0)[0]

    assert stored.free_spaces == 0
    assert not stored.has_room
    assert stored.updated_at == NOW
