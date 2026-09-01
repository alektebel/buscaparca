"""Composicion de prior + posterior + geometria en la unica cantidad que importa al conductor:

    p = probabilidad de encontrar AL MENOS un hueco al recorrer este tramo

    p = 1 - (1 - f)^C * exp(-lambda * tau)
        |___ plazas ya libres ___|  |___ plazas que se liberan mientras pasas ___|

Las dos ramas se estiman por separado porque las alimentan datos distintos: la ocupacion viene del
prior mas las observaciones de "pase y no habia"; la tasa de liberacion viene de los eventos
`unpark` que el movil detecta solo.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.config import Settings
from app.domain import Segment, SegmentStats, TimeContext
from app.model.posterior import BetaPosterior, GammaPosterior
from app.model.prior import PriorModel

# Rotacion de referencia: cada cuantas horas cambia de dueno una plaza. En zona regulada la
# estancia maxima son dos horas, pero la rotacion efectiva es bastante menor: residentes,
# autorizados y coches que reponen el ticket.
BASE_TURNOVER_H: dict[bool, float] = {True: 5.0, False: 12.0}
# Cuantos coches compiten por cada hueco cuando la zona esta saturada. Sin este termino el modelo
# predice que aparcar en Chueca es facil, porque en una calle de treinta plazas alguien se va cada
# diez minutos. Y se va: lo que pasa es que el hueco se lo lleva el coche que iba delante.
COMPETITION_K = 8.0
# Cuantos minutos de observacion "vale" el prior de la tasa de liberacion.
LAMBDA_PRIOR_STRENGTH_MIN = 240.0


@dataclass(frozen=True)
class Availability:
    segment_id: str
    p_free: float  # probabilidad de encontrar hueco al recorrer el tramo (prior + evidencia)
    free_fraction: float  # fraccion de plazas libres esperada (estimacion estructural)
    vacancy_rate_per_min: float  # huecos liberados por minuto
    confidence: float  # 0..1, de la varianza del posterior
    capacity: int


def probability_of_finding(
    free_fraction: float, capacity: int, vacancy_rate_per_min: float, traversal_min: float
) -> float:
    """Probabilidad de encontrar hueco recorriendo el tramo durante `traversal_min` minutos."""
    if capacity <= 0:
        return 0.0
    f = min(max(free_fraction, 0.0), 1.0)
    all_taken = (1.0 - f) ** capacity
    none_frees_up = math.exp(-max(vacancy_rate_per_min, 0.0) * max(traversal_min, 0.0))
    return 1.0 - all_taken * none_frees_up


def capture_share(traffic_pressure: float) -> float:
    """Que fraccion de los huecos que se liberan puedes coger TU.

    Es el mecanismo central del problema y el que la intuicion se salta: en una zona saturada no
    compites contra las plazas, compites contra los otros conductores que tambien estan dando
    vueltas. Cuanto mas cargada la zona, mas coches buscando y menos huecos te tocan.
    """
    pressure = min(max(traffic_pressure, 0.0), 1.0)
    return 1.0 / (1.0 + COMPETITION_K * pressure**2)


def activity_factor(traffic_pressure: float) -> float:
    """Cuanta rotacion hay ahora mismo, respecto a un dia medio.

    A las cuatro de la manana casi nadie mueve el coche: la rotacion no puede ser la misma que a
    las ocho. Se ata a la presion de trafico porque es la unica senal de actividad en vivo que
    tenemos para toda la ciudad.
    """
    return 0.15 + 0.85 * min(max(traffic_pressure, 0.0), 1.0)


def prior_vacancy_rate(segment: Segment, free_fraction: float, activity: float = 1.0) -> float:
    """Huecos liberados por minuto, deducidos de la rotacion tipica y de la ocupacion.

    Un tramo lleno de coches que rotan cada dos horas libera una plaza cada pocos minutos; ese
    flujo es justo lo que hace que merezca la pena dar una vuelta a la manzana en vez de irse al
    parking, y es la parte que un mapa de "plazas libres" no ve.
    """
    occupied = max(0.0, 1.0 - free_fraction) * segment.capacity
    turnover_h = BASE_TURNOVER_H[segment.is_regulated]
    return activity * occupied / (turnover_h * 60.0)


class AvailabilityModel:
    """Une el prior de features con la evidencia acumulada de cada tramo."""

    def __init__(self, prior: PriorModel, settings: Settings) -> None:
        self.prior = prior
        self.settings = settings

    def estimate(
        self,
        segment: Segment,
        ctx: TimeContext,
        stats: SegmentStats | None = None,
        traversal_min: float | None = None,
    ) -> Availability:
        """Estima la probabilidad de encontrar hueco al recorrer el tramo.

        El orden importa y es el unico correcto. Lo que observan los moviles es *"pase por esta
        calle y encontre / no encontre"*, que es un suceso a nivel de tramo, no una plaza sorteada
        al azar. Asi que la parte estructural (fraccion libre, rotacion, competencia) construye el
        **prior de esa probabilidad observable**, y la Beta actualiza sobre ella directamente.

        Poner la Beta sobre la fraccion libre seria un error: un solo `park` en una calle de treinta
        plazas la subiria del 0,4% al 11%, y con esa fraccion la probabilidad de encontrar hueco se
        dispara al 97%. Una observacion no puede valer eso.
        """
        stats = stats or SegmentStats()
        tau = traversal_min if traversal_min is not None else self.traversal_minutes(segment)

        # 1. Parte estructural: cuantas plazas libres cabe esperar y cuantas se liberan para ti.
        free_fraction = self.prior.free_fraction(segment, ctx)
        gamma = GammaPosterior.from_prior(
            prior_rate=prior_vacancy_rate(
                segment, free_fraction, activity_factor(ctx.traffic_pressure)
            ),
            strength_min=LAMBDA_PRIOR_STRENGTH_MIN,
            events=stats.unparks,
            exposure_min=stats.exposure_min,
        )
        mine = gamma.mean * capture_share(ctx.traffic_pressure)

        # 2. De ahi sale el prior de lo observable, y la evidencia lo corrige.
        prior_p = probability_of_finding(free_fraction, segment.capacity, mine, tau)
        beta = BetaPosterior.from_prior(
            prior_mean=prior_p,
            concentration=self.settings.prior_concentration,
            successes=stats.found,
            failures=stats.missed,
        )

        return Availability(
            segment_id=segment.id,
            p_free=beta.mean if segment.capacity > 0 else 0.0,
            free_fraction=free_fraction,
            vacancy_rate_per_min=mine,
            confidence=beta.confidence,
            capacity=segment.capacity,
        )

    def traversal_minutes(self, segment: Segment) -> float:
        """Lo que se tarda en recorrer el tramo buscando sitio, no circulando."""
        speed_m_per_min = self.settings.cruise_speed_kmh * 1000.0 / 60.0
        return max(segment.length_m / speed_m_per_min, 0.05)
