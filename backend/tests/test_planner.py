"""El planificador de punta a punta, sobre el centro de Madrid de demo."""

from datetime import UTC, datetime

import pytest

from app.api.deps import get_planner
from app.services.planner import Planner
from app.services.predictor import Predictor
from app.store.memory import MemoryStore

CHUECA = (-3.6975, 40.4245)
THURSDAY_EVENING = datetime(2026, 9, 3, 20, tzinfo=UTC)
THURSDAY_NIGHT = datetime(2026, 9, 3, 4, tzinfo=UTC)


@pytest.fixture
def planner(settings) -> Planner:
    store = MemoryStore.with_demo_data(settings)
    return Planner(Predictor(store, settings), settings)


def test_builds_a_corridor_that_starts_at_the_destination(planner):
    result = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING)
    walks = [d.candidate.walk_min for d in result.plan.decisions]

    assert len(result.plan.decisions) > 5
    assert walks[0] == min(walks), (
        "el corredor tiene que empezar en el portal, no en el extrarradio"
    )


def test_the_corridor_drifts_outwards(planner):
    result = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING)
    walks = [d.candidate.walk_min for d in result.plan.decisions]
    first_half = sum(walks[: len(walks) // 2]) / (len(walks) // 2)
    second_half = sum(walks[len(walks) // 2 :]) / (len(walks) - len(walks) // 2)

    assert second_half > first_half


def test_the_corridor_chains_neighbours_instead_of_zigzagging(planner):
    """Si el corredor salta de barrio en barrio, el DP cree que buscar cuesta el triple de lo real.

    Se compara con el mismo conjunto de tramos en orden aleatorio, asi que la prueba no depende de
    lo denso que sea el callejero de demo.
    """
    import random

    from app.geo import haversine_m

    result = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING)
    centroids = [result.segments[d.candidate.segment_id].centroid for d in result.plan.decisions]
    chained = sum(haversine_m(a, b) for a, b in zip(centroids, centroids[1:], strict=False))

    shuffled = list(centroids)
    random.Random(0).shuffle(shuffled)
    at_random = sum(haversine_m(a, b) for a, b in zip(shuffled, shuffled[1:], strict=False))

    # No puede ser un TSP: la restriccion de ir de dentro afuera cuesta recorrido, y compensa.
    assert chained < 0.75 * at_random


def test_night_is_faster_than_the_evening(planner):
    evening = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING, hurry=0.2)
    night = planner.plan(CHUECA, arrive_at=THURSDAY_NIGHT, hurry=0.2)

    assert night.plan.expected_minutes < evening.plan.expected_minutes
    assert night.plan.decisions[0].candidate.p_free > evening.plan.decisions[0].candidate.p_free


def test_time_to_park_stays_in_a_believable_band(planner):
    """Guardarrail de producto: si esto se dispara o se desploma, el modelo esta mintiendo."""
    evening = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING, hurry=0.2)

    assert 3.0 < evening.plan.expected_minutes < 20.0
    assert 0.03 < evening.plan.decisions[0].candidate.p_free < 0.35


def test_being_in_a_hurry_sends_you_to_the_garage_sooner(planner):
    calm = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING, hurry=0.0)
    rushed = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING, hurry=1.0)

    calm_give_up = calm.plan.give_up_index
    rushed_give_up = rushed.plan.give_up_index
    assert rushed_give_up is not None
    assert calm_give_up is None or rushed_give_up <= calm_give_up
    assert rushed.plan.p_street <= calm.plan.p_street


def test_a_longer_stay_makes_regulated_streets_relatively_worse(planner):
    """Seis horas de SER cuestan como el parking: el respaldo se vuelve competitivo."""
    short = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING, hurry=0.5, stay_hours=1.0)
    long = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING, hurry=0.5, stay_hours=6.0)

    assert long.plan.expected_price_eur > short.plan.expected_price_eur


def test_picks_a_real_garage_as_the_terminal_option(planner):
    result = planner.plan(CHUECA, arrive_at=THURSDAY_EVENING)
    assert result.plan.fallback.id.startswith("demo:")
    assert result.plan.fallback.price_eur > 0


def test_shared_planner_is_reused(settings):
    assert get_planner() is get_planner()
