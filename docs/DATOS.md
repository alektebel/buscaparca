# Datos

## Fuentes (Madrid)

| Qué | Dónde | Cada cuánto | Para qué |
|---|---|---|---|
| SER: calles y nº de plazas | [dataset 218228](https://datos.madrid.es/dataset/218228-0-ser-calles) | cuando cambie | capacidad y tipo de zona reales |
| Zonas SER (polígonos) | [dataset 200077](https://datos.madrid.es/dataset/200077-0-zona-ser) | cuando cambie | regulación por área |
| Aparcamientos rotacionales, ocupación en vivo | [dataset 50027](https://datos.madrid.es/dataset/50027-0-aparcamientosocupacionyservicios) | 5 min | **opción terminal del planificador** |
| Histórico de ocupación de aparcamientos | [dataset 300346](https://datos.madrid.es/dataset/300346-0-aparcamientos-ocupa-historico) | mensual | entrenar el prior |
| Tráfico en tiempo real (~4.000 espiras) | [dataset 202087](https://datos.madrid.es/dataset/202087-0-trafico-intensidad) | 5 min | presión de demanda: el feature más fuerte |
| Callejero, geometría y `parking:lane` | OpenStreetMap vía Overpass | cuando cambie | tramos y lados con bordillo |

Un buscador de aparcamiento ingiere datos de tráfico porque es la única señal en vivo que cubre toda
la ciudad y correlaciona con la presión de aparcamiento: cuando las espiras de un barrio se saturan,
su bordillo también.

## Aviso sobre los conectores

**Los conectores extraen por nombre de clave, no por ruta fija, y no se han podido verificar contra
el portal en vivo**: el entorno donde se escribieron no tiene salida a `datos.madrid.es`. Los
ejemplares de `backend/tests/fixtures/` están escritos a mano siguiendo el formato documentado.

La primera vez que ingieras de verdad:

```bash
cd backend
python -m app.ingest.run inspect https://datos.madrid.es/egob/catalogo/50027-1-aparcamientos-tiempo-real.json
```

Compara lo que imprime con `FREE_KEYS` / `TOTAL_KEYS` / `RATE_KEYS` en
`app/ingest/madrid/parkings.py`, ajusta si hace falta, y sustituye los ejemplares por respuestas
grabadas. `ingest_parkings` avisa por su cuenta si descarga parkings pero ninguno trae plazas
libres, que es justo el síntoma de un nombre de campo cambiado.

## Cómo se construye el callejero

```bash
export BUSCAPARCA_SQLITE_PATH=../data/buscaparca.db
cd backend
python -m app.ingest.run calles     # OSM + SER + POIs. Lento; una sola vez.
python -m app.ingest.run parkings   # cada 5 min
python -m app.ingest.run trafico    # cada 5 min
```

1. Overpass devuelve las vías con nombre donde tiene sentido aparcar en línea.
2. Cada vía se **parte en sus intersecciones**: un `way` de 800 m es inútil como unidad de
   predicción, porque la mitad de arriba y la de abajo no se parecen en nada.
3. Se cruza con el SER por nombre de calle normalizado (el padrón escribe `FUENCARRAL, CALLE DE` y
   OSM `Calle de Fuencarral`) y las plazas reales se reparten entre los tramos por longitud.
4. Donde no hay dato del SER, la capacidad se estima de la geometría descontando un tercio de
   bordillo perdido en vados, contenedores y terrazas. Es una estimación, y se nota.

## Almacenamiento

SQLite con índice por celda de ~500 m. Aguanta una ciudad de sobra y evita arrastrar PostGIS al
desarrollo. Con varios ingestores escribiendo a la vez o más de una ciudad, el salto es PostgreSQL
con PostGIS: solo cambia `app/store/`, porque la API habla con el protocolo `Store` y no con la base
de datos.

Sin `BUSCAPARCA_SQLITE_PATH` el backend arranca con un store en memoria sembrado con calles reales
del centro de Madrid (coordenadas aproximadas), suficiente para desarrollar el móvil.
