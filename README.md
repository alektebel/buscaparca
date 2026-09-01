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
make dev          # API en http://localhost:8000 con datos de demo (sin Postgres)
make test         # pytest + jest
make up           # stack completo con PostGIS
make ingest       # descarga datos abiertos de Madrid a la BD
```

Sin `DATABASE_URL` la API arranca con un *store* en memoria sembrado con tramos reales del centro de
Madrid: sirve para desarrollar el móvil y para las pruebas de humo. Con `DATABASE_URL` usa PostGIS.

Documentación: [`docs/MODELO.md`](docs/MODELO.md) · [`docs/DATOS.md`](docs/DATOS.md) · [`docs/PRIVACIDAD.md`](docs/PRIVACIDAD.md)
