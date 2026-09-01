"""Cliente HTTP de la ingesta: reintentos con espera exponencial y un User-Agent identificable.

Los portales de datos abiertos se caen, devuelven 502 y aplican rate limit. Un conector que no
reintenta acaba dejando huecos en la serie temporal justo en hora punta, que es cuando importa.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

from app.config import Settings

RETRY_STATUS = {429, 500, 502, 503, 504}


class FetchError(RuntimeError):
    pass


def fetch(
    url: str,
    settings: Settings,
    *,
    params: dict[str, Any] | None = None,
    attempts: int = 4,
    backoff_s: float = 2.0,
) -> httpx.Response:
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            response = httpx.get(
                url,
                params=params,
                timeout=settings.request_timeout_s,
                follow_redirects=True,
                headers={"User-Agent": settings.user_agent},
            )
            if response.status_code in RETRY_STATUS:
                raise FetchError(f"{url} -> HTTP {response.status_code}")
            response.raise_for_status()
            return response
        except (httpx.HTTPError, FetchError) as exc:
            last = exc
            if attempt < attempts - 1:
                time.sleep(backoff_s * (2**attempt))
    raise FetchError(f"no se pudo descargar {url}: {last}")


def find_number(payload: Any, names: tuple[str, ...], max_depth: int = 6) -> float | None:
    """Busca en profundidad el primer valor numerico cuya clave coincida con `names`.

    Los datasets municipales cambian de esquema entre versiones (y entre datasets del mismo
    portal). En vez de fijar una ruta que se rompe en silencio, se busca por nombre de clave
    normalizado y se registra en `inspect` lo que se ha encontrado.
    """
    wanted = {n.lower().replace("_", "").replace(" ", "") for n in names}

    def walk(node: Any, depth: int) -> float | None:
        if depth > max_depth:
            return None
        if isinstance(node, dict):
            for key, value in node.items():
                if key.lower().replace("_", "").replace(" ", "") in wanted:
                    number = to_float(value)
                    if number is not None:
                        return number
            for value in node.values():
                found = walk(value, depth + 1)
                if found is not None:
                    return found
        elif isinstance(node, list):
            for value in node:
                found = walk(value, depth + 1)
                if found is not None:
                    return found
        return None

    return walk(payload, 0)


def find_text(payload: Any, names: tuple[str, ...], max_depth: int = 6) -> str | None:
    wanted = {n.lower().replace("_", "").replace(" ", "") for n in names}

    def walk(node: Any, depth: int) -> str | None:
        if depth > max_depth:
            return None
        if isinstance(node, dict):
            for key, value in node.items():
                if key.lower().replace("_", "").replace(" ", "") in wanted and isinstance(
                    value, str
                ):
                    return value.strip()
            for value in node.values():
                found = walk(value, depth + 1)
                if found is not None:
                    return found
        elif isinstance(node, list):
            for value in node:
                found = walk(value, depth + 1)
                if found is not None:
                    return found
        return None

    return walk(payload, 0)


def to_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        text = value.strip().replace(".", "").replace(",", ".") if value.count(",") == 1 else value
        try:
            return float(text)
        except ValueError:
            return None
    return None
