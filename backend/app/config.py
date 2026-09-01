"""Configuracion del backend. Todo por variables de entorno, con defaults utiles."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BUSCAPARCA_", env_file=".env", extra="ignore")

    # Sin SQLITE_PATH el backend arranca con el store en memoria (demo + tests). La ingesta
    # escribe en ese fichero; ver docs/DATOS.md para el salto a PostgreSQL/PostGIS.
    sqlite_path: str | None = None

    # Ciudad soportada en v1.
    city: str = "madrid"
    city_bbox: tuple[float, float, float, float] = (-3.889, 40.312, -3.518, 40.644)

    # Fuentes de datos abiertos (documentadas en docs/DATOS.md).
    madrid_parkings_url: str = (
        "https://datos.madrid.es/egob/catalogo/50027-1-aparcamientos-tiempo-real.json"
    )
    madrid_traffic_url: str = "https://informo.madrid.es/informo/tmadrid/pm.xml"
    madrid_ser_streets_url: str = (
        "https://datos.madrid.es/egob/catalogo/218228-1-servicio-estacionamiento-regulado.csv"
    )
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    nominatim_url: str = "https://nominatim.openstreetmap.org/search"
    user_agent: str = "buscaparca/0.1 (https://github.com/alektebel/buscaparca)"

    # Modelo.
    posterior_halflife_days: float = 21.0
    # kappa: cuantas observaciones equivalentes vale el prior. Con 12, una sola pasada por una
    # calle mueve la estimacion de forma perceptible pero no la vuelca.
    prior_concentration: float = 12.0

    # Planificador.
    cruise_speed_kmh: float = 14.0  # velocidad real buscando sitio en ciudad
    walk_speed_kmh: float = 4.8
    detour_factor: float = 1.35  # calles no son lineas rectas
    max_corridor_radius_m: float = 900.0
    max_corridor_segments: int = 60

    request_timeout_s: float = 20.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
