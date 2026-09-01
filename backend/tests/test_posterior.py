import random

import pytest

from app.model.posterior import BetaPosterior, GammaPosterior, decay_weight


def test_without_data_the_posterior_is_the_prior():
    posterior = BetaPosterior.from_prior(prior_mean=0.12, concentration=8.0)
    assert posterior.mean == pytest.approx(0.12)


def test_evidence_pulls_the_posterior_towards_the_truth():
    # Prior pesimista (2%) frente a una calle que resulta estar libre el 40% de las veces.
    posterior = BetaPosterior.from_prior(0.02, concentration=8.0, successes=400, failures=600)
    assert posterior.mean == pytest.approx(0.40, abs=0.02)


def test_confidence_grows_with_evidence():
    thin = BetaPosterior.from_prior(0.1, concentration=8.0)
    thick = BetaPosterior.from_prior(0.1, concentration=8.0, successes=100, failures=900)
    assert thick.confidence > thin.confidence
    assert 0.0 <= thin.confidence <= 1.0 and 0.0 <= thick.confidence <= 1.0
    assert thick.confidence > 0.9


def test_concentration_controls_how_stubborn_the_prior_is():
    stubborn = BetaPosterior.from_prior(0.02, concentration=200.0, successes=20, failures=0)
    yielding = BetaPosterior.from_prior(0.02, concentration=2.0, successes=20, failures=0)
    assert yielding.mean > stubborn.mean


def test_decay_forgets_at_the_stated_half_life():
    assert decay_weight(0.0, 21.0) == 1.0
    assert decay_weight(21.0, 21.0) == pytest.approx(0.5)
    assert decay_weight(42.0, 21.0) == pytest.approx(0.25)


def test_thompson_sampling_stays_in_range():
    rng = random.Random(0)
    posterior = BetaPosterior.from_prior(0.1, concentration=8.0)
    draws = [posterior.sample(rng) for _ in range(200)]
    assert all(0.0 <= d <= 1.0 for d in draws)
    assert min(draws) < posterior.mean < max(draws)


def test_gamma_recovers_an_observed_rate():
    # 90 huecos observados en 300 minutos = 0,3/min; el prior de 0,01 apenas debe estorbar.
    posterior = GammaPosterior.from_prior(0.01, strength_min=10.0, events=90, exposure_min=300.0)
    assert posterior.mean == pytest.approx(0.3, abs=0.02)
    assert posterior.variance > 0
