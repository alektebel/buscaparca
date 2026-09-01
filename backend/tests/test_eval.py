"""La evaluacion tiene que detectar un modelo malo. Si no, no sirve de nada tenerla."""

import random

import pytest

from app.eval.backtest import Observation, calibration, compare_policies
from app.model.stopping import Candidate, Fallback, Weights


def synthetic(n: int, *, true_rate: float, predicted: float, seed: int = 0):
    rng = random.Random(seed)
    return [Observation(predicted=predicted, found=rng.random() < true_rate) for _ in range(n)]


def test_a_perfectly_calibrated_model_beats_nothing_when_there_is_nothing_to_predict():
    """Si todo el mundo tiene la misma probabilidad, el modelo no puede aportar. Y debe decirlo."""
    result = calibration(synthetic(4000, true_rate=0.3, predicted=0.3))

    assert result.brier == pytest.approx(result.baseline_brier, rel=0.02)
    assert abs(result.skill) < 0.05


def test_a_model_that_discriminates_scores_better_than_the_city_average():
    rng = random.Random(1)
    observations = []
    for _ in range(4000):
        easy = rng.random() < 0.5
        rate = 0.7 if easy else 0.05
        observations.append(Observation(predicted=rate, found=rng.random() < rate))

    result = calibration(observations)

    assert result.skill > 0.4
    assert result.log_loss < result.baseline_log_loss


def test_an_overconfident_model_is_punished():
    """Prometer 90% donde solo hay 30% es el fallo que hace que la gente desinstale la app."""
    honest = calibration(synthetic(4000, true_rate=0.3, predicted=0.3, seed=2))
    liar = calibration(synthetic(4000, true_rate=0.3, predicted=0.9, seed=2))

    assert liar.brier > honest.brier
    assert liar.log_loss > honest.log_loss
    assert liar.skill < 0


def test_reliability_curve_tracks_the_truth():
    rng = random.Random(3)
    observations = [
        Observation(predicted=p, found=rng.random() < p)
        for p in (0.05, 0.25, 0.55, 0.85)
        for _ in range(1500)
    ]

    for mean_predicted, observed, count in calibration(observations).reliability:
        assert count > 0
        assert observed == pytest.approx(mean_predicted, abs=0.05)


def test_rejects_an_empty_evaluation():
    with pytest.raises(ValueError, match="observaciones"):
        calibration([])


def corridor(p: float, n: int = 12, walk_step: float = 1.2):
    return [
        Candidate(
            f"s{i}",
            f"Calle {i}",
            p_free=p,
            walk_min=1.0 + i * walk_step,
            price_eur=0.0,
            drive_min_to_next=0.7,
            drive_min_to_fallback=2.0,
        )
        for i in range(n)
    ]


def test_optimal_stopping_beats_circling_when_the_street_is_hopeless():
    """El caso que motiva la app: cuando no hay sitio, dar vueltas es lo peor que puedes hacer."""
    fallback = Fallback("p", "Parking", walk_min=4.0, price_eur=4.0)
    results = compare_policies(corridor(p=0.04), fallback, Weights.from_hurry(0.8), runs=4000)

    assert results["parada_optima"].minutes < results["dar_vueltas"].minutes
    assert results["parada_optima"].parked_on_street < results["dar_vueltas"].parked_on_street


def test_optimal_stopping_does_not_send_you_to_the_garage_when_there_is_room():
    fallback = Fallback("p", "Parking", walk_min=4.0, price_eur=6.0)
    results = compare_policies(corridor(p=0.75), fallback, Weights.from_hurry(0.5), runs=4000)

    assert results["parada_optima"].parked_on_street > 0.95
    assert results["parada_optima"].minutes == pytest.approx(
        results["dar_vueltas"].minutes, rel=0.15
    )


def test_the_simulation_agrees_with_the_dp_expectation():
    """Monte Carlo contra la induccion hacia atras: si no coinciden, uno de los dos miente."""
    from app.model.stopping import solve

    fallback = Fallback("p", "Parking", walk_min=4.0, price_eur=4.0)
    weights = Weights.from_hurry(0.5)
    candidates = corridor(p=0.2)

    plan = solve(candidates, fallback, weights)
    simulated = compare_policies(candidates, fallback, weights, runs=40_000)["parada_optima"]

    assert simulated.minutes == pytest.approx(plan.expected_minutes, rel=0.03)
    assert simulated.price_eur == pytest.approx(plan.expected_price_eur, rel=0.05)
    assert simulated.parked_on_street == pytest.approx(plan.p_street, abs=0.02)
