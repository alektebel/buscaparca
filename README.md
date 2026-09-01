# BuscaParca

Encontrar aparcamiento **rápido**, sin dar vueltas.

Tres piezas que se necesitan mutuamente:

1. **Dónde suele haber hueco** — modelo bayesiano por tramo de calle y franja horaria. El *prior* se
   construye con datos abiertos de Madrid, así que funciona el día 1, sin un solo usuario.
2. **Dónde hay hueco ahora** — ocupación en tiempo real de parkings + eventos de aparcar/desaparcar
   que el móvil detecta solo, sin que toques nada.
3. **Cuándo parar de buscar** — el problema del aparcamiento es un *optimal stopping*. Un DP hacia
   atrás sobre el corredor de aproximación decide si aceptas el hueco que tienes delante o sigues.
   El resultado no es un mapa bonito: es **"acepta cualquier hueco a partir de ahora"**.

```
buscaparca/
├── backend/     FastAPI + PostGIS · ingesta, modelo, planificador
├── mobile/      Expo / React Native (Android primero)
├── infra/       docker-compose
└── data/        backfill de históricos
```

## Arranque rápido

```bash
make dev          # API en http://localhost:8000 con datos de demo, sin base de datos
make test         # pytest (backend) + jest (móvil)
make lint         # ruff + tsc
make up           # API + ingestor en Docker
make ingest       # descarga los datos abiertos de Madrid
make mobile       # arranca Expo
```

Sin `BUSCAPARCA_SQLITE_PATH` la API arranca con un *store* en memoria sembrado con calles reales del
centro de Madrid: sirve para desarrollar el móvil y para las pruebas de humo. Con la variable puesta
usa el SQLite que llena la ingesta.

Una respuesta de `/v1/plan` no es un mapa de calor: es una decisión.

```
POST /v1/plan  {"lat": 40.4245, "lon": -3.6975, "hurry": 0.5, "stay_hours": 2}

  "acepta cualquier hueco a menos de 240 m"
  tardarás 7 min · pagarás 4,80 € · 92 % de acabar en la calle
  si a la altura de Calle de Belén sigues sin nada, tira para el Parking de Barceló
```

## Documentación

- [`docs/MODELO.md`](docs/MODELO.md) — las tres capas y la parada óptima
- [`docs/DATOS.md`](docs/DATOS.md) — fuentes, ingesta y el aviso sobre los conectores
- [`docs/PRIVACIDAD.md`](docs/PRIVACIDAD.md) — qué sale del teléfono y qué no
- [`docs/DECISIONES.md`](docs/DECISIONES.md) — por qué esto es así
