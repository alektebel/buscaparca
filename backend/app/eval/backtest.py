"""Evaluacion del modelo: ¿esta bien calibrado, y sirve de algo comparado con no hacer nada?

Dos preguntas distintas y las dos importan:

1. **Calibracion.** Cuando la app dice 20%, ¿sale hueco una de cada cinco veces? Un modelo mal
   calibrado que ordena bien los tramos sigue mandandote a la calle equivocada, porque el DP usa
   las probabilidades como numeros, no como ranking. Se mide con Brier y log-loss frente al
   baseline de "la media de la ciudad", mas la curva de fiabilidad por tramos.
2. **Utilidad.** ¿Cuantos minutos ahorra la politica de parada optima frente a lo que hace todo el
   mundo (ir al destino y dar vueltas)? Es la metrica de producto y la unica que justifica la app.
"""

from __future__ import annotations

import math
import random
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, replace

from app.model.stopping import Candidate, Fallback, StoppingPlan, Weights, solve

EPSILON = 1e-9


@dataclass(frozen=True)
class Observation:
    """Una busqueda real: lo que el modelo predijo y lo que de verdad paso."""

    predicted: float
    found: bool


@dataclass(frozen=True)
class Calibration:
    n: int
    brier: float
    log_loss: float
    baseline_brier: float
    baseline_log_loss: float
    reliability: list[tuple[float, float, int]]  # (p media predicha, tasa real, n)

    @property
    def skill(self) -> float:
        """Brier skill score frente al baseline. > 0 = el modelo aporta; <= 0 = no aporta nada."""
        if self.baseline_brier <= EPSILON:
            return 0.0
        return 1.0 - self.brier / self.baseline_brier


def calibration(observations: Sequence[Observation], bins: int = 10) -> Calibration:
    if not observations:
        raise ValueError("no hay observaciones que evaluar")

    base_rate = sum(o.found for o in observations) / len(observations)

    def brier(predictions: Iterable[float]) -> float:
        pairs = list(zip(predictions, observations, strict=True))
        return sum((p - o.found) ** 2 for p, o in pairs) / len(pairs)

    def log_loss(predictions: Iterable[float]) -> float:
        total = 0.0
        for p, o in zip(predictions, observations, strict=True):
            q = min(max(p, EPSILON), 1 - EPSILON)
            total -= math.log(q) if o.found else math.log(1 - q)
        return total / len(observations)

    predicted = [o.predicted for o in observations]
    flat = [base_rate] * len(observations)

    buckets: dict[int, list[Observation]] = {}
    for o in observations:
        buckets.setdefault(min(int(o.predicted * bins), bins - 1), []).append(o)

    reliability = [
        (
            sum(o.predicted for o in group) / len(group),
            sum(o.found for o in group) / len(group),
            len(group),
        )
        for _, group in sorted(buckets.items())
    ]

    return Calibration(
        n=len(observations),
        brier=brier(predicted),
        log_loss=log_loss(predicted),
        baseline_brier=brier(flat),
        baseline_log_loss=log_loss(flat),
        reliability=reliability,
    )


@dataclass(frozen=True)
class SearchOutcome:
    minutes: float
    price_eur: float
    parked_on_street: bool


def simulate(
    candidates: Sequence[Candidate],
    fallback: Fallback,
    plan: StoppingPlan,
    rng: random.Random,
) -> SearchOutcome:
    """Recorre el corredor una vez, tirando los dados en cada tramo y siguiendo la politica."""
    minutes = 0.0
    for decision in plan.decisions:
        c = decision.candidate
        if rng.random() < c.p_free and decision.accept:
            return SearchOutcome(minutes + c.walk_min, c.price_eur, True)
        if decision.bail:
            return SearchOutcome(
                minutes + c.drive_min_to_fallback + fallback.walk_min, fallback.price_eur, False
            )
        minutes += c.drive_min_to_next
    return SearchOutcome(minutes + fallback.walk_min, fallback.price_eur, False)


def compare_policies(
    candidates: Sequence[Candidate],
    fallback: Fallback,
    weights: Weights,
    runs: int = 20_000,
    seed: int = 0,
) -> dict[str, SearchOutcome]:
    """Parada optima frente a lo que hace todo el mundo.

    El baseline `dar_vueltas` es el metodo humano: coger el primer hueco que aparezca, sin
    rendirse nunca. Es sorprendentemente bueno cuando hay sitio, y es exactamente lo que arruina
    la tarde cuando no lo hay.
    """
    optimal = solve(list(candidates), fallback, weights)
    # El metodo humano: aceptar lo primero que aparezca y no rendirse nunca.
    cruise_forever = replace(
        optimal,
        decisions=[replace(d, accept=True, bail=False) for d in optimal.decisions],
        give_up_index=None,
    )

    results: dict[str, SearchOutcome] = {}
    for name, policy in (("parada_optima", optimal), ("dar_vueltas", cruise_forever)):
        rng = random.Random(seed)
        runs_out = [simulate(candidates, fallback, policy, rng) for _ in range(runs)]
        results[name] = SearchOutcome(
            minutes=sum(r.minutes for r in runs_out) / runs,
            price_eur=sum(r.price_eur for r in runs_out) / runs,
            parked_on_street=sum(r.parked_on_street for r in runs_out) / runs,
        )
    return results
