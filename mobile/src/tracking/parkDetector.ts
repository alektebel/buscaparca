/**
 * Deteccion automatica de aparcar y desaparcar, a partir del GPS.
 *
 * Es el motor de datos de todo el sistema. Un boton de "he aparcado aqui" no escala porque nadie
 * lo pulsa: la senal util solo aparece si el telefono la saca solo. Y es tambien la razon de que
 * esto sea una app y no una web: ningun navegador da ubicacion en segundo plano.
 *
 * La secuencia que se busca es la que hace cualquiera al aparcar:
 *
 *     conduciendo -> parado un rato en el mismo sitio -> alejandose andando
 *
 * Los tres pasos son necesarios. Sin el tercero, un semaforo largo o un atasco cuentan como
 * aparcamiento; y un `park` falso no solo es ruido, es una calle que la app recomienda mal.
 *
 * El reductor es puro a proposito: se prueba entero sin GPS, sin permisos y sin telefono.
 */

import { haversineM, speedMps, type Point } from '../geo';

export type Sample = {
  point: Point;
  at: number; // epoch ms
  speedMps?: number; // si el proveedor lo da, se usa; si no, se deduce
  accuracyM?: number;
};

export type DetectedEvent = {
  kind: 'park' | 'unpark';
  point: Point;
  at: number;
};

export type Phase = 'unknown' | 'driving' | 'stopped' | 'parked';

export type DetectorState = {
  phase: Phase;
  last: Sample | null;
  /**
   * Donde y cuando se detuvo el coche, candidato a plaza mientras no se confirme, y cuando se le
   * vio quieto por ultima vez. Lo que cuenta para el umbral es `stillAt - at`, o sea el tiempo que
   * el coche estuvo de verdad parado: si se midiera hasta el momento de detectar que te alejas, los
   * dos minutos que tardas en andar cien metros contarian como aparcamiento.
   */
  stoppedAt: { point: Point; at: number; stillAt: number } | null;
  /** Posicion del coche una vez confirmado el aparcamiento. */
  car: { point: Point; at: number } | null;
};

export const DRIVING_SPEED_MPS = 4.2; // ~15 km/h sostenidos: ya no vas andando
export const STOPPED_SPEED_MPS = 1.0;
export const STOP_RADIUS_M = 30; // margen de deriva del GPS con el coche parado
export const STOP_MIN_MS = 3 * 60_000; // 3 min parado: descarta semaforos y atascos
export const WALK_AWAY_M = 100; // te has bajado y te vas
export const RETURN_M = 40; // has vuelto al coche
export const MAX_ACCURACY_M = 50; // una lectura peor que esto no vale para nada
export const MAX_GAP_MS = 10 * 60_000; // hueco largo sin muestras: se pierde el hilo

export function initialState(): DetectorState {
  return { phase: 'unknown', last: null, stoppedAt: null, car: null };
}

function isDriving(sample: Sample, previous: Sample | null): boolean {
  const speed = sample.speedMps ?? derivedSpeed(previous, sample);
  return speed !== null && speed >= DRIVING_SPEED_MPS;
}

function derivedSpeed(previous: Sample | null, sample: Sample): number | null {
  if (!previous) return null;
  return speedMps({ point: previous.point, at: previous.at }, { point: sample.point, at: sample.at });
}

function isSlow(sample: Sample, previous: Sample | null): boolean {
  const speed = sample.speedMps ?? derivedSpeed(previous, sample);
  return speed !== null && speed <= STOPPED_SPEED_MPS;
}

/**
 * Consume una muestra y devuelve el estado nuevo y los eventos que hayan quedado confirmados.
 * No muta `state`.
 */
export function step(
  state: DetectorState,
  sample: Sample,
): { state: DetectorState; events: DetectedEvent[] } {
  if (sample.accuracyM !== undefined && sample.accuracyM > MAX_ACCURACY_M) {
    return { state, events: [] };
  }

  // Un salto largo sin muestras (tunel, movil apagado) no permite afirmar nada de lo que paso
  // en medio. Se reinicia la fase pero se conserva donde quedo el coche.
  if (state.last && sample.at - state.last.at > MAX_GAP_MS) {
    const restarted: DetectorState = {
      phase: state.car ? 'parked' : 'unknown',
      last: sample,
      stoppedAt: null,
      car: state.car,
    };
    return { state: restarted, events: [] };
  }

  const previous = state.last;
  const events: DetectedEvent[] = [];
  let next: DetectorState = { ...state, last: sample };

  switch (state.phase) {
    case 'unknown':
      if (isDriving(sample, previous)) next.phase = 'driving';
      break;

    case 'driving':
      if (isSlow(sample, previous)) {
        next.phase = 'stopped';
        next.stoppedAt = { point: sample.point, at: sample.at, stillAt: sample.at };
      }
      break;

    case 'stopped': {
      const stop = state.stoppedAt!;
      const drift = haversineM(stop.point, sample.point);
      const stillFor = stop.stillAt - stop.at;

      if (isDriving(sample, previous)) {
        // Era un semaforo o un atasco: no habia plaza.
        next.phase = 'driving';
        next.stoppedAt = null;
        break;
      }
      if (drift <= STOP_RADIUS_M) {
        // Sigue ahi (dentro de la deriva del GPS): el reloj de "parado" corre.
        next.stoppedAt = { ...stop, stillAt: sample.at };
        break;
      }
      if (drift > WALK_AWAY_M && stillFor >= STOP_MIN_MS) {
        // Estuvo parado el tiempo suficiente y ahora te alejas a pie: eso es un coche aparcado.
        next.phase = 'parked';
        next.car = { point: stop.point, at: stop.at };
        next.stoppedAt = null;
        events.push({ kind: 'park', point: stop.point, at: stop.at });
        break;
      }
      if (stillFor < STOP_MIN_MS) {
        // Se movio antes de tiempo: el coche no llego a quedarse ahi.
        next.stoppedAt = { point: sample.point, at: sample.at, stillAt: sample.at };
      }
      break;
    }

    case 'parked': {
      const car = state.car!;
      if (isDriving(sample, previous) && haversineM(car.point, sample.point) > RETURN_M) {
        next.phase = 'driving';
        next.car = null;
        events.push({ kind: 'unpark', point: car.point, at: sample.at });
      }
      break;
    }
  }

  return { state: next, events };
}

/** Aplica una secuencia entera de muestras. Util para reproducir una traza grabada. */
export function replay(
  samples: Sample[],
  from: DetectorState = initialState(),
): { state: DetectorState; events: DetectedEvent[] } {
  let state = from;
  const events: DetectedEvent[] = [];
  for (const sample of samples) {
    const result = step(state, sample);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}
