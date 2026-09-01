"""Capa bayesiana: conjugados con decaimiento temporal.

Dos cantidades por (tramo, franja):

* `f` = fraccion de plazas libres            -> Beta-Binomial
* `lambda` = huecos liberados por minuto     -> Gamma-Poisson

En ambos casos el prior viene del modelo de features (`app.model.prior`), asi que un tramo del que
no sabemos nada devuelve la prediccion del prior, y uno muy observado devuelve la realidad. La
varianza del posterior no se tira: es la confianza que muestra la app y lo que permite explorar
tramos poco vistos en vez de mandar a todo el mundo al mismo sitio.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


def decay_weight(age_days: float, halflife_days: float) -> float:
    """Peso de una observacion de hace `age_days` dias. Una calle cambia; los datos caducan."""
    if age_days <= 0:
        return 1.0
    if halflife_days <= 0:
        return 0.0
    return 0.5 ** (age_days / halflife_days)


@dataclass(frozen=True)
class BetaPosterior:
    alpha: float
    beta: float

    @classmethod
    def from_prior(
        cls, prior_mean: float, concentration: float, successes: float = 0.0, failures: float = 0.0
    ) -> BetaPosterior:
        """`concentration` (kappa) = cuantas observaciones equivalentes vale el prior."""
        mu = min(max(prior_mean, 1e-6), 1 - 1e-6)
        k = max(concentration, 1e-6)
        return cls(alpha=k * mu + successes, beta=k * (1 - mu) + failures)

    @property
    def mean(self) -> float:
        return self.alpha / (self.alpha + self.beta)

    @property
    def variance(self) -> float:
        a, b, n = self.alpha, self.beta, self.alpha + self.beta
        return (a * b) / (n * n * (n + 1))

    @property
    def stddev(self) -> float:
        return math.sqrt(self.variance)

    @property
    def confidence(self) -> float:
        """0 = no tenemos ni idea, 1 = certeza. La desviacion de una Beta nunca pasa de 0.5."""
        return max(0.0, min(1.0, 1.0 - 2.0 * self.stddev))

    def sample(self, rng) -> float:
        """Muestreo de Thompson: explorar tramos poco observados sin mandar alli a todo el mundo."""
        return rng.betavariate(self.alpha, self.beta)


@dataclass(frozen=True)
class GammaPosterior:
    """Posterior de una tasa Poisson. `shape`/`rate` en las unidades de `exposure`."""

    shape: float
    rate: float

    @classmethod
    def from_prior(
        cls,
        prior_rate: float,
        strength_min: float,
        events: float = 0.0,
        exposure_min: float = 0.0,
    ) -> GammaPosterior:
        """`strength_min` = minutos de observacion equivalentes que vale el prior."""
        r = max(prior_rate, 1e-9)
        s = max(strength_min, 1e-6)
        return cls(shape=r * s + events, rate=s + exposure_min)

    @property
    def mean(self) -> float:
        return self.shape / self.rate

    @property
    def variance(self) -> float:
        return self.shape / (self.rate**2)

    def sample(self, rng) -> float:
        return rng.gammavariate(self.shape, 1.0 / self.rate)
