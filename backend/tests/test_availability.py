from app.domain import SegmentStats
from app.model.availability import (
    AvailabilityModel,
    activity_factor,
    capture_share,
    prior_vacancy_rate,
    probability_of_finding,
)
from app.model.prior import PriorModel

from .conftest import make_segment


def test_no_capacity_means_no_chance():
    assert probability_of_finding(0.5, capacity=0, vacancy_rate_per_min=1.0, traversal_min=5) == 0.0


def test_more_capacity_more_chance():
    low = probability_of_finding(0.02, 10, 0.0, 1.0)
    high = probability_of_finding(0.02, 60, 0.0, 1.0)
    assert 0 < low < high < 1


def test_a_longer_pass_catches_more_departures():
    quick = probability_of_finding(0.0, 30, 0.2, 0.5)
    slow = probability_of_finding(0.0, 30, 0.2, 5.0)
    assert slow > quick


def test_turnover_alone_can_find_you_a_spot_on_a_full_street():
    """Ninguna plaza libre parada, pero la gente se va: es lo que busca el conductor."""
    assert probability_of_finding(0.0, 30, 0.25, 4.0) > 0.6


def test_activity_scales_turnover_with_the_hour():
    assert activity_factor(0.0) < activity_factor(0.5) < activity_factor(1.0)
    segment = make_segment(capacity=30)
    dead_of_night = prior_vacancy_rate(segment, 0.02, activity_factor(0.05))
    rush_hour = prior_vacancy_rate(segment, 0.02, activity_factor(0.9))
    assert rush_hour > 4 * dead_of_night


def test_competition_is_what_makes_a_busy_zone_hard(settings, evening):
    """En zona saturada los huecos se liberan igual: lo que no llegan es a ti."""
    from app.domain import TimeContext

    segment = make_segment(capacity=30)
    pressure = 0.9
    rate = prior_vacancy_rate(segment, 0.004, activity_factor(pressure))

    # Con la calle llena (ninguna plaza libre parada), lo unico que queda es cazar una salida:
    # ahi se ve el efecto de la competencia sin que lo tape el termino de plazas ya libres.
    ignoring_rivals = probability_of_finding(0.0, 30, rate, traversal_min=1.0)
    with_rivals = probability_of_finding(0.0, 30, rate * capture_share(pressure), traversal_min=1.0)

    assert capture_share(0.05) > 5 * capture_share(0.95)
    assert ignoring_rivals > 4 * with_rivals

    # Y de punta a punta: una zona descargada es claramente mejor que una atascada.
    model = AvailabilityModel(PriorModel.cold_start(), settings)
    empty = model.estimate(segment, TimeContext(when=evening.when, traffic_pressure=0.05))
    gridlock = model.estimate(segment, TimeContext(when=evening.when, traffic_pressure=0.95))
    assert empty.p_free > 1.7 * gridlock.p_free


def test_evidence_overrides_the_prior(settings, evening):
    model = AvailabilityModel(PriorModel.cold_start(), settings)
    segment = make_segment(capacity=25)

    blind = model.estimate(segment, evening)
    # Una calle que, contra todo pronostico, casi siempre tiene sitio a esa hora.
    observed = model.estimate(segment, evening, SegmentStats(found=200.0, missed=10.0))

    assert observed.p_free > 0.8
    assert observed.p_free > blind.p_free
    assert observed.confidence > blind.confidence
    # La fraccion libre es la estimacion estructural y no la tocan las observaciones de tramo:
    # lo que se actualiza es la probabilidad observable.
    assert observed.free_fraction == blind.free_fraction


def test_one_observation_does_not_flip_the_estimate(settings, evening):
    """Un solo `park` no puede convertir una calle imposible en una calle facil.

    Es el fallo que tenia el modelo cuando la Beta estaba puesta sobre la fraccion de plazas: un
    unico evento la subia del 0,4% al 11%, y con esa fraccion una calle de treinta plazas daba un
    97% de encontrar hueco. Lo que observa un movil es un suceso de tramo, no una plaza sorteada.
    """
    model = AvailabilityModel(PriorModel.cold_start(), settings)
    segment = make_segment(capacity=30)

    blind = model.estimate(segment, evening)
    once = model.estimate(segment, evening, SegmentStats(found=1.0))

    assert once.p_free > blind.p_free
    assert once.p_free < blind.p_free + 0.12


def test_night_is_easier_than_the_evening(settings, evening, night):
    model = AvailabilityModel(PriorModel.cold_start(), settings)
    segment = make_segment(capacity=25)
    assert (
        model.estimate(segment, night).free_fraction
        > model.estimate(segment, evening).free_fraction
    )


def test_calibration_stays_in_a_believable_band(settings, evening):
    """Guardarrail de calibracion: una calle del centro a las 20:00 no puede salir facil.

    Sin esto es facilisimo que un retoque en el prior deje al modelo prometiendo huecos que no
    existen, que es la unica forma segura de que la gente desinstale la app.
    """
    model = AvailabilityModel(PriorModel.cold_start(), settings)
    estimate = model.estimate(make_segment(capacity=25), evening)

    assert 0.001 < estimate.free_fraction < 0.010
    assert 0.04 < estimate.p_free < 0.20
