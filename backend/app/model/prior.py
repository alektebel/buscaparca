"""Prior de arranque en frio: features -> fraccion de plazas libres esperada.

Esto es lo que hace que la app sirva el dia 1, en calles donde ningun usuario ha estado nunca.
Los coeficientes de `COLD_START` estan puestos a mano con criterio; `fit()` los sustituye en cuanto
la ingesta acumula historico (se entrena contra la ocupacion de los aparcamientos rotacionales, que
es el mejor proxy publico de la presion de aparcamiento de la zona).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from app.domain import Segment, TimeContext
from app.model.features import FEATURE_NAMES, N_FEATURES, build_features

# Calibracion de arranque en frio. Los armonicos estan en fase para que el maximo de plazas libres
# caiga de madrugada (~05:00) y el minimo a primera hora de la noche (~20:00), que es cuando en
# Madrid coinciden los residentes en casa y la gente saliendo.
#
# El nivel esta calibrado para que en el centro salga una fraccion libre por debajo del 0,5% en
# hora punta y en torno al 1% de madrugada, que da una probabilidad de ~0,11 de encontrar hueco al
# recorrer una calle de 260 m a las 20:00 y de ~0,29 a las 4:00. Son numeros puestos con criterio,
# no medidos: `PriorModel.fit()` los sustituye en cuanto la ingesta acumula historico, y
# `app/eval/backtest.py` comprueba que el sustituto es mejor. Lo que hace que encuentres sitio no
# son las plazas libres paradas, sino la rotacion menos la competencia (ver `availability.py`).
COLD_START: dict[str, float] = {
    "intercept": -4.00,
    "ser_azul": -0.30,  # alta rotacion, pero altisima demanda
    "ser_verde": -0.20,
    "ser_larga": 0.45,  # larga estancia: menos disputada
    "log_capacity": 0.20,  # calles largas y anchas perdonan mas
    "poi_density": -0.22,  # bares, oficinas y colegios se comen el bordillo
    # A*cos(theta - phi) con A=0.40 y pico a las 05:00 -> (sin, cos) = (A*sin(phi), A*cos(phi))
    "sin_dia": 0.386,
    "cos_dia": 0.104,
    # Segundo armonico, A=0.12 y pico a las 04:00: afila el valle de la tarde-noche.
    "sin_dia_2": 0.104,
    "cos_dia_2": -0.060,
    "noche": 0.25,  # menos coches dando vueltas
    "noche_x_ocio": -0.30,  # ...salvo en la calle de copas, que de noche va peor
    "sabado": 0.15,
    "festivo": 0.30,
    "presion_trafico": -0.85,  # la senal en vivo mas fuerte que tenemos
    "lluvia": -0.25,
}


def _sigmoid(z: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(z, -35.0, 35.0)))


@dataclass
class PriorModel:
    """Regresion logistica con respuesta binomial (fraccion libre + numero de plazas como peso)."""

    coef: np.ndarray

    @classmethod
    def cold_start(cls) -> PriorModel:
        return cls(np.array([COLD_START[name] for name in FEATURE_NAMES], dtype=float))

    def __post_init__(self) -> None:
        if self.coef.shape != (N_FEATURES,):
            raise ValueError(f"se esperaban {N_FEATURES} coeficientes, hay {self.coef.shape}")

    def free_fraction(self, segment: Segment, ctx: TimeContext) -> float:
        x = build_features(segment, ctx)
        return float(_sigmoid(x @ self.coef))

    def free_fraction_batch(self, segments: list[Segment], ctx: TimeContext) -> np.ndarray:
        x = np.vstack([build_features(s, ctx) for s in segments])
        return _sigmoid(x @ self.coef)

    def as_dict(self) -> dict[str, float]:
        return dict(zip(FEATURE_NAMES, (float(c) for c in self.coef), strict=True))

    def fit(
        self,
        x: np.ndarray,
        y: np.ndarray,
        weights: np.ndarray | None = None,
        l2: float = 1.0,
        max_iter: int = 50,
        tol: float = 1e-8,
    ) -> PriorModel:
        """Ajusta por IRLS (Newton-Raphson con reponderacion), con regularizacion L2.

        `y` es la fraccion libre observada en [0, 1] y `weights` el numero de plazas que respalda
        cada observacion, que es lo que convierte esto en una binomial y no en una regresion sobre
        proporciones sin varianza conocida.
        """
        n, d = x.shape
        if d != N_FEATURES:
            raise ValueError(f"x tiene {d} columnas, se esperaban {N_FEATURES}")
        w_obs = np.ones(n) if weights is None else np.asarray(weights, dtype=float)
        beta = np.zeros(d)
        penalty = l2 * np.eye(d)
        penalty[0, 0] = 0.0  # el intercept no se penaliza

        for _ in range(max_iter):
            mu = _sigmoid(x @ beta)
            var = np.clip(mu * (1 - mu), 1e-9, None) * w_obs
            gradient = x.T @ (w_obs * (y - mu)) - penalty @ beta
            hessian = (x.T * var) @ x + penalty
            step = np.linalg.solve(hessian, gradient)
            beta = beta + step
            if float(np.max(np.abs(step))) < tol:
                break

        self.coef = beta
        return self


def logit(p: float) -> float:
    p = min(max(p, 1e-9), 1 - 1e-9)
    return math.log(p / (1 - p))
