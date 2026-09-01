from datetime import UTC, datetime

import pytest

from app.config import Settings
from app.domain import SER_AZUL, Segment, TimeContext
from app.geo import destination_point

MADRID = (-3.6975, 40.4245)


@pytest.fixture
def settings() -> Settings:
    return Settings(sqlite_path=None)


@pytest.fixture
def evening() -> TimeContext:
    # Jueves a las 20:00: el peor momento para aparcar en el centro de Madrid.
    return TimeContext(when=datetime(2026, 9, 3, 20, tzinfo=UTC), traffic_pressure=0.85)


@pytest.fixture
def night() -> TimeContext:
    return TimeContext(when=datetime(2026, 9, 3, 4, tzinfo=UTC), traffic_pressure=0.06)


def make_segment(
    segment_id: str = "s1",
    *,
    length_m: float = 200.0,
    capacity: int = 25,
    ser_zone: str | None = SER_AZUL,
    poi_density: float = 3.0,
    origin: tuple[float, float] = MADRID,
    bearing: float = 0.0,
) -> Segment:
    return Segment(
        id=segment_id,
        name=f"Calle {segment_id}",
        geometry=[origin, destination_point(origin, bearing, length_m)],
        length_m=length_m,
        capacity=capacity,
        ser_zone=ser_zone,
        poi_density=poi_density,
    )
