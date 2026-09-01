import numpy as np
import pytest

from app.domain import SER_LARGA, TimeContext
from app.model.features import N_FEATURES, build_features
from app.model.prior import PriorModel

from .conftest import make_segment


def test_irls_recovers_known_coefficients():
    """Si el ajuste no recupera unos coeficientes que hemos fijado nosotros, no sirve para nada."""
    rng = np.random.default_rng(7)
    truth = rng.normal(scale=0.7, size=N_FEATURES)
    truth[0] = -2.0

    x = rng.normal(size=(4000, N_FEATURES))
    x[:, 0] = 1.0
    probabilities = 1 / (1 + np.exp(-x @ truth))
    trials = np.full(4000, 300.0)
    observed = rng.binomial(trials.astype(int), probabilities) / trials

    fitted = PriorModel(np.zeros(N_FEATURES)).fit(x, observed, weights=trials, l2=1e-6)

    assert np.max(np.abs(fitted.coef - truth)) < 0.08


def test_cold_start_puts_the_daily_peak_at_night_and_the_trough_in_the_evening():
    model = PriorModel.cold_start()
    segment = make_segment(capacity=25)
    by_hour = {
        hour: model.free_fraction(
            segment,
            TimeContext(
                when=__import__("datetime").datetime(2026, 9, 3, hour), traffic_pressure=0.5
            ),
        )
        for hour in range(24)
    }

    assert max(by_hour, key=by_hour.get) in range(2, 8)
    assert min(by_hour, key=by_hour.get) in range(17, 23)


def test_traffic_pressure_is_the_strongest_live_signal(evening):
    model = PriorModel.cold_start()
    segment = make_segment()
    calm = model.free_fraction(segment, TimeContext(when=evening.when, traffic_pressure=0.05))
    jammed = model.free_fraction(segment, TimeContext(when=evening.when, traffic_pressure=0.95))
    assert calm > jammed * 1.5


def test_long_stay_zones_are_freer_than_high_turnover_ones(evening):
    model = PriorModel.cold_start()
    azul = model.free_fraction(make_segment("a"), evening)
    larga = model.free_fraction(make_segment("b", ser_zone=SER_LARGA), evening)
    assert larga > azul


def test_leisure_density_hurts(evening):
    model = PriorModel.cold_start()
    quiet = model.free_fraction(make_segment("q", poi_density=0.0), evening)
    busy = model.free_fraction(make_segment("b", poi_density=8.0), evening)
    assert quiet > busy


def test_feature_vector_shape_is_the_contract(evening):
    assert build_features(make_segment(), evening).shape == (N_FEATURES,)


def test_rejects_a_wrong_sized_coefficient_vector():
    with pytest.raises(ValueError, match="coeficientes"):
        PriorModel(np.zeros(3))
