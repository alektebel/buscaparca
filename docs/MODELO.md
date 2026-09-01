# El modelo

Tres capas. Cada una resuelve un problema que las otras no pueden.

## 1. Prior: qué esperar de una calle en la que nunca ha estado nadie

`backend/app/model/prior.py`

Regresión logística con respuesta binomial (la fracción de plazas libres, pesada por el número de
plazas) sobre features del tramo y del momento: tipo de zona SER, capacidad, densidad de POIs, ciclo
diario en dos armónicos, tipo de día, presión de tráfico en vivo y lluvia.

Esto es lo que permite que la app sirva **el día 1**, antes de tener un solo usuario. Los
coeficientes de `COLD_START` están puestos a mano con criterio y calibrados contra una referencia
explícita (fracción libre por debajo del 0,5 % en el centro en hora punta, ~1 % de madrugada).
`PriorModel.fit()` los sustituye por coeficientes ajustados en cuanto la ingesta acumula histórico;
se entrena por IRLS, sin dependencias pesadas.

## 2. Posterior: qué dice la realidad

`backend/app/model/posterior.py`

Dos conjugados, con decaimiento exponencial (semivida de tres semanas, porque una calle cambia):

| Cantidad | Modelo | De dónde salen los datos |
|---|---|---|
| `f`, fracción de plazas libres | Beta-Binomial | prior + eventos `park` / `cruise_no_spot` |
| `λ`, huecos liberados por minuto | Gamma-Poisson | prior + eventos `unpark` |

La concentración `κ` decide cuánta evidencia hace falta para desmentir al prior. La **varianza no se
tira**: es la confianza que enseña la app, y habilita muestreo de Thompson para explorar tramos poco
observados en vez de mandar a todo el mundo al mismo sitio.

## 3. De ahí a la única cifra que le importa al conductor

`backend/app/model/availability.py`

```
p = 1 − (1−f)^C · exp(−λ_tuyo · τ)
    |__ plazas ya libres __|  |__ plazas que se liberan mientras pasas __|
```

`λ_tuyo = λ · captura(presión)`, y ahí está la parte que la intuición se salta. En una calle de
treinta plazas con rotación normal alguien se va cada diez minutos. Y se va: lo que pasa es que en
zona saturada el hueco se lo lleva el coche que iba delante. Sin el término de **competencia**, el
modelo predice que aparcar en Chueca es fácil.

```
captura(presión) = 1 / (1 + 8·presión²)
```

## 4. Parada óptima: cuándo dejar de buscar

`backend/app/model/stopping.py`

Buscar aparcamiento es literalmente un problema de *optimal stopping*. Sobre el corredor ordenado
de tramos, por inducción hacia atrás:

```
aceptar_i  = w_andar · andar_i + precio_i
buscar_i   = w_conducir · conducir_i + V_{i+1}
rendirse_i = w_conducir · conducir_al_parking_i + V_n
seguir_i   = min(buscar_i, rendirse_i)
V_i        = p_i · min(aceptar_i, seguir_i) + (1−p_i) · seguir_i
V_n        = w_andar · andar_parking + precio_parking
```

La política óptima es una **regla de umbral**: acepta si `aceptar_i ≤ seguir_i`, lo que en la app se
traduce en *"acepta cualquier hueco a menos de X metros"*. Dos detalles hacen que esto sirva y no
sea un ejercicio:

- **El parking de pago como opción terminal**, con su tarifa y sus plazas libres reales del feed en
  vivo. Sin fondo, la recursión no cierra y el modelo te dejaría dando vueltas para siempre.
- **La rama de rendirse.** En cualquier punto puedes dejar de buscar y tirar para el parking. El DP
  dice *cuándo* deja de compensar seguir (`give_up_index`), que es exactamente lo que se pidió: no
  dar vueltas.

La prisa es un único control y cambia la **razón** entre el valor de andar y el de conducir. Escalar
los dos pesos a la vez no cambiaría nada: el DP es invariante a escala salvo por el dinero, y hay un
test que lo comprueba.

## El corredor

`backend/app/model/corridor.py`

Anillos concéntricos alrededor del destino y, dentro de cada anillo, encadenado al vecino más
cercano. De dentro afuera, porque así los primeros candidatos son los mejores y el umbral se relaja
según te alejas; y encadenado, porque si el corredor salta de barrio en barrio el DP cree que buscar
cuesta el triple de lo que cuesta.

## Cómo se sabe si esto funciona

`backend/app/eval/backtest.py`

- **Calibración**: Brier y log-loss frente al baseline "la media de la ciudad", más la curva de
  fiabilidad. Un modelo que ordena bien pero está mal calibrado sigue mandándote mal, porque el DP
  usa las probabilidades como números y no como ranking.
- **Utilidad**: simulación Monte Carlo de la política de parada óptima frente a "dar vueltas hasta
  encontrar algo". Hay un test que exige que la simulación coincida con la esperanza que calcula la
  inducción hacia atrás: si no coinciden, uno de los dos miente.
