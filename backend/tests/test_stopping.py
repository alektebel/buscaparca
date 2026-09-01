"""El DP de parada optima contra casos con solucion conocida.

Es el modulo con mas riesgo de la aplicacion: un signo cambiado aqui no rompe nada visiblemente,
solo hace que la app mande a la gente a dar vueltas. Asi que se comprueba contra la recursion
resuelta a mano, y ademas por propiedades que tienen que cumplirse siempre.
"""

import pytest

from app.model.stopping import Candidate, Fallback, Weights, solve

FAR = 999.0  # pierna al parking tan larga que rendirse nunca compensa


def homogeneous(n: int, *, p: float, walk_min: float, drive_min: float, price: float = 0.0):
    return [
        Candidate(
            segment_id=f"s{i}",
            label=f"Calle {i}",
            p_free=p,
            walk_min=walk_min,
            price_eur=price,
            drive_min_to_next=drive_min,
            drive_min_to_fallback=FAR,
        )
        for i in range(n)
    ]


def test_matches_the_recursion_solved_by_hand():
    weights = Weights(walk_eur_per_min=0.20, drive_eur_per_min=0.50)
    fallback = Fallback(id="p", label="Parking", walk_min=6.0, price_eur=5.0)
    candidates = homogeneous(5, p=0.3, walk_min=2.0, drive_min=1.0)

    plan = solve(candidates, fallback, weights)

    # Recursion calculada aparte, sin tocar el codigo bajo prueba.
    value = weights.walk_eur_per_min * fallback.walk_min + fallback.price_eur
    for _ in range(5):
        accept_cost = weights.walk_eur_per_min * 2.0
        continue_cost = weights.drive_eur_per_min * 1.0 + value
        value = 0.3 * min(accept_cost, continue_cost) + 0.7 * continue_cost

    assert plan.expected_value_eur == pytest.approx(value)


def test_expected_time_matches_the_geometric_solution():
    """En un corredor largo y homogeneo el tiempo tiende a (p*andar + (1-p)*conducir)/p."""
    weights = Weights(walk_eur_per_min=0.20, drive_eur_per_min=0.50)
    fallback = Fallback(id="p", label="Parking", walk_min=6.0, price_eur=5.0)
    p, walk, drive = 0.35, 2.0, 1.0

    plan = solve(homogeneous(400, p=p, walk_min=walk, drive_min=drive), fallback, weights)

    limit = (p * walk + (1 - p) * drive) / p
    assert plan.expected_minutes == pytest.approx(limit, rel=0.01)


def test_policy_is_a_threshold_on_walking_distance():
    """Misma p en todos, pero unos mas lejos que otros: solo se aceptan los de dentro del umbral."""
    weights = Weights.from_hurry(0.5)
    fallback = Fallback(id="p", label="Parking", walk_min=8.0, price_eur=6.0)
    candidates = [
        Candidate(
            f"s{i}",
            f"Calle {i}",
            0.25,
            walk_min=w,
            price_eur=0.0,
            drive_min_to_next=0.6,
            drive_min_to_fallback=FAR,
        )
        for i, w in enumerate([1.0, 3.0, 6.0, 12.0, 25.0])
    ]

    plan = solve(candidates, fallback, weights)

    for decision in plan.decisions:
        expected = decision.candidate.walk_min <= decision.walk_threshold_min
        assert decision.accept is expected


def test_an_expensive_garage_makes_you_less_picky():
    """Si el respaldo es caro, compensa aceptar huecos peores. Es la propiedad clave del modelo."""
    weights = Weights.from_hurry(0.5)
    candidates = homogeneous(10, p=0.25, walk_min=5.0, drive_min=0.8)

    cheap = solve(candidates, Fallback("p", "Parking", walk_min=5.0, price_eur=2.0), weights)
    dear = solve(candidates, Fallback("p", "Parking", walk_min=5.0, price_eur=20.0), weights)

    assert dear.accept_walk_threshold_min > cheap.accept_walk_threshold_min


def test_better_streets_ahead_make_you_pickier():
    weights = Weights.from_hurry(0.5)
    fallback = Fallback("p", "Parking", walk_min=6.0, price_eur=5.0)
    near = Candidate(
        "near",
        "Cerca",
        0.2,
        walk_min=4.0,
        price_eur=0.0,
        drive_min_to_next=0.5,
        drive_min_to_fallback=FAR,
    )

    def ahead(p: float):
        return (
            solve([near] + homogeneous(8, p=p, walk_min=1.0, drive_min=0.5), fallback, weights)
            .decisions[0]
            .walk_threshold_min
        )

    assert ahead(0.6) < ahead(0.05)


def test_policy_is_invariant_to_scaling_the_value_of_time():
    """Sin dinero de por medio, doblar el valor del tiempo no cambia que hacer: solo la escala."""
    fallback = Fallback("p", "Parking", walk_min=6.0, price_eur=0.0)
    candidates = [
        Candidate(
            f"s{i}",
            f"Calle {i}",
            0.2 + 0.05 * i,
            walk_min=1.0 + i,
            price_eur=0.0,
            drive_min_to_next=0.7,
            drive_min_to_fallback=FAR,
        )
        for i in range(8)
    ]

    base = solve(candidates, fallback, Weights(0.2, 0.5))
    scaled = solve(candidates, fallback, Weights(0.4, 1.0))

    assert [d.accept for d in base.decisions] == [d.accept for d in scaled.decisions]
    assert scaled.expected_value_eur == pytest.approx(2 * base.expected_value_eur)


def test_gives_up_when_cruising_costs_more_than_the_garage():
    """La rama que da sentido a la app: en algun momento hay que dejar de dar vueltas."""
    weights = Weights.from_hurry(1.0)
    fallback = Fallback("p", "Parking", walk_min=3.0, price_eur=4.0)
    hopeless = [
        Candidate(
            f"s{i}",
            f"Calle {i}",
            p_free=0.02,
            walk_min=8.0,
            price_eur=0.0,
            drive_min_to_next=3.0,
            drive_min_to_fallback=1.0,
        )
        for i in range(10)
    ]

    plan = solve(hopeless, fallback, weights)

    assert plan.give_up_index == 0
    assert plan.p_street < 0.1
    assert plan.expected_price_eur == pytest.approx(fallback.price_eur, rel=0.2)


def test_never_gives_up_when_the_street_is_plentiful():
    weights = Weights.from_hurry(0.5)
    fallback = Fallback("p", "Parking", walk_min=10.0, price_eur=9.0)
    plan = solve(homogeneous(10, p=0.8, walk_min=2.0, drive_min=0.4), fallback, weights)

    assert plan.give_up_index is None
    assert plan.p_street > 0.99


def test_empty_corridor_falls_back_to_the_garage():
    fallback = Fallback("p", "Parking", walk_min=4.0, price_eur=3.0)
    plan = solve([], fallback, Weights.from_hurry(0.5))

    assert plan.p_street == 0.0
    assert plan.expected_minutes == pytest.approx(4.0)
    assert plan.expected_price_eur == pytest.approx(3.0)


def test_hurry_trades_money_and_walking_for_less_driving():
    calm = Weights.from_hurry(0.0)
    rushed = Weights.from_hurry(1.0)
    # Con prisa, un minuto conduciendo vale MUCHO mas respecto a uno andando.
    assert rushed.drive_eur_per_min / rushed.walk_eur_per_min > (
        calm.drive_eur_per_min / calm.walk_eur_per_min
    )
