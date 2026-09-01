# Privacidad

La app pide ubicación en segundo plano. Eso es lo más invasivo que puede pedir una aplicación
móvil, y el sistema está construido para que **el recorrido no salga nunca del teléfono**.

## Qué sale del teléfono

Solo esto, por evento:

```json
{ "segment_id": "osm:12345:2", "kind": "park", "at": "2026-09-03T20:35:00Z" }
```

Un identificador de tramo de calle y una hora redondeada a cinco minutos.

## Qué no sale

- La traza GPS. Ni entera, ni en trozos, ni "anonimizada".
- Coordenadas sueltas. El ajuste de una posición al tramo de calle se hace **en el dispositivo**
  (`mobile/src/tracking/snap.ts`) contra los tramos que la app ya se ha descargado. Si no hay un
  tramo creíble a menos de 35 m, **el evento se descarta**: antes perder el dato que mandar una
  coordenada.
- El destino al que vas. Se manda para calcular el plan, pero no se asocia a ningún identificador
  ni se almacena.
- Un identificador de usuario. No hay cuentas, ni login, ni identificador persistente ligado a una
  persona. El backend recibe eventos, no perfiles.

Hay un test que lo fija (`backend/tests/test_api.py::test_events_never_take_raw_coordinates`): si
alguien añade `lat`/`lon` al endpoint de eventos, el test se pone rojo.

## Qué se guarda en el teléfono

Estado del detector, la caché de tramos de la zona y la cola de eventos pendientes de subir
(AsyncStorage). `forgetEverything()` y `outbox.clear()` lo borran; lo que aún no ha salido, no sale.

## Permisos

- El seguimiento en segundo plano es **opcional**. Sin él la app sigue prediciendo y planificando:
  lo que se pierde es la contribución de datos.
- En Android va con servicio en primer plano y aviso permanente, que es lo correcto: la app dice
  todo el rato que está mirando la ubicación.
- El texto del permiso explica para qué es y que no se guarda el recorrido (`app.json`).

## Lo que queda pendiente

- Borrado a petición de eventos ya subidos. Hoy no hay a quién asociarlos, lo que es bueno para la
  privacidad y malo para poder retirarlos: hace falta un token rotatorio por dispositivo que permita
  borrar sin identificar. Está sin hacer.
- Un tramo de calle en una hora concreta es un dato de baja resolución, pero no es nulo: si de una
  calle solo hay un usuario, sus eventos son suyos. Un umbral de k-anonimato antes de servir
  posteriores por tramo es el siguiente paso.
