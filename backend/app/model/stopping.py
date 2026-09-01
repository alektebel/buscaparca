"""Parada optima: el corazon de la app.

Buscar aparcamiento es literalmente un problema de *optimal stopping*. Vas recorriendo una
secuencia de tramos ordenada (el corredor), y en cada uno o hay hueco o no. Si lo hay tienes que
decidir en dos segundos: lo cojo, o sigo esperando algo mejor mas cerca del portal.

Se resuelve por induccion hacia atras. Sea `V_i` el coste esperado de llegar al tramo `i` jugando
optimamente a partir de ahi:

    aceptar_i  = w_andar * andar_i + precio_i
    buscar_i   = w_conducir * conducir_i + V_{i+1}
    rendirse_i = w_conducir * conducir_al_parking_i + V_n
    seguir_i   = min(buscar_i, rendirse_i)
    V_i        = p_i * min(aceptar_i, seguir_i) + (1 - p_i) * seguir_i
    V_n        = w_andar * andar_parking + precio_parking      <- opcion terminal

La rama `rendirse` hace que esto valga para lo que el usuario pidio: en cualquier punto
puedes dejar de buscar y tirar para el parking, y el DP te dice *cuando* deja de compensar seguir.
Ese indice (`give_up_index`) es una salida de primera clase del planificador.

La politica optima resulta ser una **regla de umbral**: acepta el hueco del tramo `i` si y solo si
`aceptar_i <= seguir_i`, lo que en la app se traduce en un radio: *"acepta cualquier hueco a menos
de X metros del destino"*.

El parking de pago como opcion terminal es lo que hace que la recursion sea finita y honesta: nunca
te deja dando vueltas indefinidamente, que es exactamente el fallo del metodo humano.

Todos los costes estan en euros. El tiempo entra convertido a euros por los pesos, que salen de un
unico control en la UI ("prisa").
"""

from __future__ import annotations

from dataclasses import dataclass

# Valor del tiempo en EUR/min segun la prisa, en (prisa=0, prisa=1).
#
# Lo que importa no es la escala sino la RAZON entre andar y conducir: multiplicar los dos pesos por
# la misma constante deja la politica intacta (el DP es invariante a escala salvo por el
# dinero). Con
# prisa, un minuto mas dando vueltas se vuelve carisimo y andar sale casi gratis en comparacion: es
# exactamente la preferencia de "aparca ya, aunque tenga que andar o pagar".
WALK_EUR_PER_MIN = (0.05, 0.40)
DRIVE_EUR_PER_MIN = (0.10, 2.50)


@dataclass(frozen=True)
class Weights:
    walk_eur_per_min: float
    drive_eur_per_min: float

    @classmethod
    def from_hurry(cls, hurry: float) -> Weights:
        """`hurry` en [0, 1]: 0 = "me da igual andar, no quiero pagar", 1 = "aparca ya"."""
        h = min(max(hurry, 0.0), 1.0)

        def lerp(bounds: tuple[float, float]) -> float:
            return bounds[0] + (bounds[1] - bounds[0]) * h

        return cls(
            walk_eur_per_min=lerp(WALK_EUR_PER_MIN),
            drive_eur_per_min=lerp(DRIVE_EUR_PER_MIN),
        )


@dataclass(frozen=True)
class Candidate:
    """Un tramo del corredor, en el orden en que lo vas a recorrer."""

    segment_id: str
    label: str
    p_free: float  # prob. de encontrar hueco al recorrerlo
    walk_min: float  # de aqui al destino, andando
    price_eur: float  # lo que cuesta aparcar aqui el rato previsto (SER)
    drive_min_to_next: float  # conducir hasta el siguiente candidato
    drive_min_to_fallback: float = 0.0  # conducir desde aqui hasta el parking de respaldo
    confidence: float = 0.5


@dataclass(frozen=True)
class Fallback:
    """La opcion terminal: el parking de pago al que vas si el corredor se agota."""

    id: str
    label: str
    walk_min: float
    price_eur: float


@dataclass(frozen=True)
class Decision:
    candidate: Candidate
    accept: bool
    value_eur: float  # V_i
    accept_cost_eur: float
    continue_cost_eur: float  # el mejor de seguir buscando / rendirse
    cruise_cost_eur: float
    bail_cost_eur: float
    bail: bool  # si no hay hueco aqui, ¿me rindo y me voy al parking?
    walk_threshold_min: float  # acepta aqui si andar_min <= esto


@dataclass(frozen=True)
class StoppingPlan:
    decisions: list[Decision]
    fallback: Fallback
    weights: Weights
    # Coste en la metrica interna del DP: dinero + tiempo convertido a dinero. Sirve para comparar
    # politicas, no para ensenarselo a nadie.
    expected_value_eur: float
    expected_minutes: float  # conducir + andar, esperados, siguiendo la politica
    expected_price_eur: float  # dinero de verdad: SER o parking
    p_street: float  # probabilidad de acabar en la calle y no en el parking
    accept_walk_threshold_min: float  # el umbral aqui y ahora
    give_up_index: int | None  # primer tramo en el que rendirse ya es lo optimo


def solve(candidates: list[Candidate], fallback: Fallback, weights: Weights) -> StoppingPlan:
    """Induccion hacia atras sobre el corredor. O(n)."""
    if not candidates:
        terminal = weights.walk_eur_per_min * fallback.walk_min + fallback.price_eur
        return StoppingPlan(
            decisions=[],
            fallback=fallback,
            weights=weights,
            expected_value_eur=terminal,
            expected_minutes=fallback.walk_min,
            expected_price_eur=fallback.price_eur,
            p_street=0.0,
            accept_walk_threshold_min=0.0,
            give_up_index=None,
        )

    n = len(candidates)
    # value[i], minutes[i], price[i] y street[i] son los valores esperados *al entrar* al tramo i.
    value = [0.0] * (n + 1)
    minutes = [0.0] * (n + 1)
    price = [0.0] * (n + 1)
    street = [0.0] * (n + 1)

    terminal_value = weights.walk_eur_per_min * fallback.walk_min + fallback.price_eur
    value[n] = terminal_value
    minutes[n] = fallback.walk_min
    price[n] = fallback.price_eur
    street[n] = 0.0

    decisions: list[Decision | None] = [None] * n
    for i in range(n - 1, -1, -1):
        c = candidates[i]
        p = min(max(c.p_free, 0.0), 1.0)

        accept_cost = weights.walk_eur_per_min * c.walk_min + c.price_eur
        # Dos formas de no aceptar: seguir con el corredor, o rendirse y tirar para el parking.
        cruise_cost = weights.drive_eur_per_min * c.drive_min_to_next + value[i + 1]
        bail_cost = weights.drive_eur_per_min * c.drive_min_to_fallback + terminal_value
        bail = bail_cost < cruise_cost
        continue_cost = min(cruise_cost, bail_cost)
        accept = accept_cost <= continue_cost

        value[i] = p * min(accept_cost, continue_cost) + (1 - p) * continue_cost

        if bail:
            continue_min = c.drive_min_to_fallback + fallback.walk_min
            continue_price = fallback.price_eur
            continue_street = 0.0
        else:
            continue_min = c.drive_min_to_next + minutes[i + 1]
            continue_price = price[i + 1]
            continue_street = street[i + 1]

        minutes[i] = p * (c.walk_min if accept else continue_min) + (1 - p) * continue_min
        price[i] = p * (c.price_eur if accept else continue_price) + (1 - p) * continue_price
        street[i] = p * (1.0 if accept else continue_street) + (1 - p) * continue_street

        # Umbral: lo maximo que compensa andar aceptando aqui, dado lo que cuesta este tramo.
        threshold = (continue_cost - c.price_eur) / weights.walk_eur_per_min
        decisions[i] = Decision(
            candidate=c,
            accept=accept,
            value_eur=value[i],
            accept_cost_eur=accept_cost,
            continue_cost_eur=continue_cost,
            cruise_cost_eur=cruise_cost,
            bail_cost_eur=bail_cost,
            bail=bail,
            walk_threshold_min=max(0.0, threshold),
        )

    resolved = [d for d in decisions if d is not None]
    return StoppingPlan(
        decisions=resolved,
        fallback=fallback,
        weights=weights,
        expected_value_eur=value[0],
        expected_minutes=minutes[0],
        expected_price_eur=price[0],
        p_street=street[0],
        accept_walk_threshold_min=resolved[0].walk_threshold_min,
        give_up_index=next((i for i, d in enumerate(resolved) if d.bail), None),
    )
