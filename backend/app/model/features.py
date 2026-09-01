"""Vector de features de (tramo, momento). El orden es contrato: no reordenar sin migrar pesos."""

from __future__ import annotations

import math

import numpy as np

from app.domain import SER_AZUL, SER_LARGA, SER_VERDE, Segment, TimeContext

FEATURE_NAMES: tuple[str, ...] = (
    "intercept",
    "ser_azul",
    "ser_verde",
    "ser_larga",
    "log_capacity",  # centrado en log(20): un tramo "normal"
    "poi_density",  # centrado en 2 POIs / 100 m
    "sin_dia",  # primer armonico del ciclo diario
    "cos_dia",
    "sin_dia_2",  # segundo armonico: capta los dos valles (manana y tarde)
    "cos_dia_2",
    "noche",  # 00:00-06:00
    "noche_x_ocio",  # de noche, una calle de bares no se vacia: se llena
    "sabado",
    "festivo",
    "presion_trafico",  # 0..1, de las espiras de trafico cercanas
    "lluvia",
)

N_FEATURES = len(FEATURE_NAMES)


def build_features(segment: Segment, ctx: TimeContext) -> np.ndarray:
    hour = ctx.when.hour + ctx.when.minute / 60.0
    theta = 2 * math.pi * hour / 24.0
    night = 1.0 if hour < 6.0 else 0.0
    poi = segment.poi_density - 2.0
    day_type = ctx.day_type

    return np.array(
        [
            1.0,
            1.0 if segment.ser_zone == SER_AZUL else 0.0,
            1.0 if segment.ser_zone == SER_VERDE else 0.0,
            1.0 if segment.ser_zone == SER_LARGA else 0.0,
            math.log(max(segment.capacity, 1)) - math.log(20.0),
            poi,
            math.sin(theta),
            math.cos(theta),
            math.sin(2 * theta),
            math.cos(2 * theta),
            night,
            night * poi,
            1.0 if day_type == "sabado" else 0.0,
            1.0 if day_type == "festivo" else 0.0,
            ctx.traffic_pressure,
            1.0 if ctx.rain else 0.0,
        ],
        dtype=float,
    )
