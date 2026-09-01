/**
 * El detector es el motor de datos del sistema: si se inventa aparcamientos, el modelo aprende
 * mentiras y la app manda a la gente a calles equivocadas. Por eso se prueba con trazas completas
 * y con los falsos positivos clasicos (semaforo, atasco, parada de un minuto).
 */

import {
  DRIVING_SPEED_MPS,
  MAX_GAP_MS,
  STOP_MIN_MS,
  initialState,
  replay,
  type Sample,
} from '../src/tracking/parkDetector';

const START = { lon: -3.7013, lat: 40.4256 };
const T0 = 1_756_000_000_000;

/** Desplaza un punto `metres` hacia el norte. */
function north(metres: number) {
  return { lon: START.lon, lat: START.lat + metres / 111_320 };
}

function driving(count: number, fromMs: number, fromMetres: number): Sample[] {
  // 20 s por muestra a ~30 km/h = 167 m entre muestras.
  return Array.from({ length: count }, (_, i) => ({
    point: north(fromMetres + i * 167),
    at: fromMs + i * 20_000,
    speedMps: 8.3,
    accuracyM: 8,
  }));
}

function stationary(count: number, fromMs: number, at: { lon: number; lat: number }): Sample[] {
  return Array.from({ length: count }, (_, i) => ({
    point: at,
    at: fromMs + i * 20_000,
    speedMps: 0,
    accuracyM: 10,
  }));
}

function walking(count: number, fromMs: number, fromMetres: number): Sample[] {
  // 20 s por muestra a 1,4 m/s = 28 m entre muestras.
  return Array.from({ length: count }, (_, i) => ({
    point: north(fromMetres + i * 28),
    at: fromMs + i * 20_000,
    speedMps: 1.4,
    accuracyM: 12,
  }));
}

describe('deteccion de aparcamiento', () => {
  it('detecta la secuencia completa: conducir, parar, alejarse andando', () => {
    const stop = north(1000);
    const samples = [
      ...driving(6, T0, 0),
      ...stationary(12, T0 + 120_000, stop), // 4 minutos parado
      ...walking(6, T0 + 360_000, 1000), // y se aleja a pie
    ];

    const { events, state } = replay(samples);

    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('park');
    expect(events[0]!.point.lat).toBeCloseTo(stop.lat, 5);
    expect(state.phase).toBe('parked');
    expect(state.car).not.toBeNull();
  });

  it('no confunde un semaforo con una plaza', () => {
    const samples = [
      ...driving(5, T0, 0),
      ...stationary(3, T0 + 100_000, north(835)), // un minuto en rojo
      ...driving(5, T0 + 160_000, 835),
    ];

    const { events, state } = replay(samples);

    expect(events).toHaveLength(0);
    expect(state.phase).toBe('driving');
  });

  it('no confunde un atasco largo con una plaza', () => {
    // Diez minutos parado, mas que el umbral, pero luego arranca: nunca hubo aparcamiento.
    const samples = [
      ...driving(5, T0, 0),
      ...stationary(30, T0 + 100_000, north(835)),
      ...driving(5, T0 + 800_000, 835),
    ];

    expect(replay(samples).events).toHaveLength(0);
  });

  it('no cuenta una parada corta aunque te bajes del coche', () => {
    // Parar un minuto y salir andando: dejar a alguien, no aparcar.
    const samples = [
      ...driving(5, T0, 0),
      ...stationary(3, T0 + 100_000, north(835)),
      ...walking(8, T0 + 160_000, 835),
    ];

    expect(replay(samples).events).toHaveLength(0);
  });

  it('detecta que sales de la plaza al volver y arrancar', () => {
    const stop = north(1000);
    const parked = replay([
      ...driving(6, T0, 0),
      ...stationary(12, T0 + 120_000, stop),
      ...walking(6, T0 + 360_000, 1000),
    ]);

    const later = T0 + 4 * 3_600_000;
    const { events, state } = replay(
      [
        { point: stop, at: later, speedMps: 0, accuracyM: 10 },
        { point: north(1200), at: later + 30_000, speedMps: 9, accuracyM: 10 },
      ],
      parked.state,
    );

    expect(events.map((e) => e.kind)).toEqual(['unpark']);
    expect(events[0]!.point.lat).toBeCloseTo(stop.lat, 5);
    expect(state.phase).toBe('driving');
    expect(state.car).toBeNull();
  });

  it('ignora lecturas de GPS malas', () => {
    const rubbish: Sample = { point: north(5000), at: T0 + 1000, accuracyM: 400 };
    const before = initialState();
    expect(replay([rubbish], before).state).toEqual(before);
  });

  it('no afirma nada tras un tunel o el movil apagado', () => {
    const stop = north(1000);
    const parked = replay([
      ...driving(6, T0, 0),
      ...stationary(12, T0 + 120_000, stop),
      ...walking(6, T0 + 360_000, 1000),
    ]);

    const { state, events } = replay(
      [{ point: north(9000), at: T0 + MAX_GAP_MS * 3, speedMps: 10, accuracyM: 10 }],
      parked.state,
    );

    expect(events).toHaveLength(0);
    expect(state.phase).toBe('parked');
    expect(state.car).not.toBeNull(); // el coche sigue donde lo dejaste
  });

  it('deduce la velocidad cuando el proveedor no la da', () => {
    const samples: Sample[] = [
      { point: north(0), at: T0, accuracyM: 8 },
      { point: north(400), at: T0 + 20_000, accuracyM: 8 }, // 20 m/s
    ];
    expect(replay(samples).state.phase).toBe('driving');
    expect(20).toBeGreaterThan(DRIVING_SPEED_MPS);
  });

  it('cuenta el tiempo que el coche estuvo quieto, no el que tardas en alejarte', () => {
    // Dos minutos y medio parado y luego a pie: los dos minutos de caminata no pueden completar
    // el umbral, o cualquier parada corta acabaria contando como aparcamiento.
    const stop = north(1000);
    const stillMs = STOP_MIN_MS - 30_000;
    const samples = [
      ...driving(6, T0, 0),
      ...stationary(Math.floor(stillMs / 20_000), T0 + 120_000, stop),
      ...walking(10, T0 + 120_000 + stillMs, 1000),
    ];

    expect(replay(samples).events).toHaveLength(0);
  });

  it('sigue detectando el aparcamiento si el coche estuvo quieto de sobra', () => {
    const stop = north(1000);
    const samples = [
      ...driving(6, T0, 0),
      ...stationary(15, T0 + 120_000, stop), // 5 minutos
      ...walking(10, T0 + 420_000, 1000),
    ];

    expect(replay(samples).events.map((e) => e.kind)).toEqual(['park']);
  });
});
