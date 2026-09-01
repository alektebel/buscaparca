# Decisiones

Por qué esto es así y no de otra manera.

## App móvil, no web

La detección automática de aparcar y desaparcar es el motor de datos de todo el sistema, y **un
navegador no puede hacerla**: iOS Safari no da geolocalización en segundo plano y Android la corta
al minimizar. Sin ella dependes de que la gente pulse un botón, y no lo hará.

Para evitar la fricción de "app de descargar", v1 no pasa por tiendas: se genera un APK con EAS
Build y se instala directamente. Fricción de un día, no dos semanas de revisión.

## Tramo de calle, no celda hexagonal

El aparcamiento en calle es lineal. Además, el DP de parada óptima necesita una **secuencia
ordenada** de candidatos a lo largo de un recorrido, que es exactamente lo que es un corredor de
tramos. Las celdas H3 solo aparecen, si acaso, en la capa de presentación.

## Bayesiano jerárquico, no aprendizaje profundo

Con pocos datos gana el modelo con prior. Además: arranca en frío sin usuarios, da incertidumbre
utilizable (confianza en la UI, exploración por Thompson) y se puede leer y discutir coeficiente a
coeficiente. Una red no daba nada de eso a cambio de bastante más maquinaria.

## SQLite antes que PostGIS

El plan aprobado decía PostgreSQL con PostGIS. Se implementó SQLite porque es lo que se puede
**verificar de verdad hoy** (el entorno no podía levantar PostGIS), aguanta una ciudad de sobra y
mantiene el desarrollo sin dependencias. La API habla con el protocolo `Store`, así que el cambio
es un fichero en `app/store/`. Con varios ingestores concurrentes o más de una ciudad, tocará.

## Un solo control: la prisa

Los pesos del problema de parada óptima podrían exponerse como tres deslizadores (valor de andar,
de conducir, del dinero). No se hace porque nadie los ajustaría bien, y porque el DP es invariante
a escala: lo único que mueve la política es la **razón** entre ellos. Un control con semántica clara
("sin prisa / normal / aparca ya") cubre todo el rango útil.

## El parking de pago no es un plan B, es parte del modelo

Es la opción terminal de la recursión. Sin él, el problema no tiene fondo y la política óptima es
buscar indefinidamente, que es precisamente el fallo del método humano. Que venga con tarifa y
plazas libres reales del feed municipal es lo que hace que la decisión de rendirse sea honesta.
