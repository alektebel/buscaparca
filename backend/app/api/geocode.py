"""GET /v1/geocode - buscar el destino por nombre. Proxy fino sobre Nominatim."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import settings as get_settings_dep
from app.config import Settings
from app.schemas import GeocodeHit

router = APIRouter(prefix="/v1", tags=["geocode"])


@router.get("/geocode", response_model=list[GeocodeHit])
async def geocode(
    q: str = Query(..., min_length=3, max_length=120),
    settings: Settings = Depends(get_settings_dep),
) -> list[GeocodeHit]:
    params = {
        "q": q,
        "format": "jsonv2",
        "limit": 6,
        "countrycodes": "es",
        "viewbox": ",".join(
            str(v)
            for v in (
                settings.city_bbox[0],
                settings.city_bbox[3],
                settings.city_bbox[2],
                settings.city_bbox[1],
            )
        ),
        "bounded": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_s) as client:
            response = await client.get(
                settings.nominatim_url, params=params, headers={"User-Agent": settings.user_agent}
            )
            response.raise_for_status()
            hits = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"geocodificador no disponible: {exc}") from exc

    return [
        GeocodeHit(label=h["display_name"], lat=float(h["lat"]), lon=float(h["lon"])) for h in hits
    ]
