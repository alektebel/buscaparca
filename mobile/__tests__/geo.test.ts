import { distanceToPolylineM, distanceToSegmentM, haversineM, speedMps } from '../src/geo';

const SOL = { lon: -3.7038, lat: 40.4168 };
const PLAZA_ESPANA = { lon: -3.7124, lat: 40.4238 };

describe('geometria en el telefono', () => {
  it('mide una distancia conocida', () => {
    expect(haversineM(SOL, PLAZA_ESPANA)).toBeGreaterThan(950);
    expect(haversineM(SOL, PLAZA_ESPANA)).toBeLessThan(1070);
  });

  it('es cero sobre si mismo', () => {
    expect(haversineM(SOL, SOL)).toBe(0);
  });

  it('proyecta sobre el tramo y no sobre la recta infinita', () => {
    const a = { lon: -3.7000, lat: 40.4200 };
    const b = { lon: -3.6990, lat: 40.4200 };
    // Un punto pasado el extremo b: la distancia tiene que medirse a b, no a la prolongacion.
    const beyond = { lon: -3.6970, lat: 40.4200 };
    expect(distanceToSegmentM(beyond, a, b)).toBeCloseTo(haversineM(beyond, b), 0);
  });

  it('mide la perpendicular cuando el punto cae dentro del tramo', () => {
    const a = { lon: -3.7000, lat: 40.4200 };
    const b = { lon: -3.6980, lat: 40.4200 };
    const middleOffset = { lon: -3.6990, lat: 40.4205 };
    expect(distanceToSegmentM(middleOffset, a, b)).toBeCloseTo(haversineM(middleOffset, { lon: -3.6990, lat: 40.4200 }), 0);
  });

  it('toma el tramo mas cercano de una polilinea', () => {
    const polyline = [
      { lon: -3.7000, lat: 40.4200 },
      { lon: -3.6990, lat: 40.4200 },
      { lon: -3.6990, lat: 40.4210 },
    ];
    const nearCorner = { lon: -3.69895, lat: 40.42005 };
    expect(distanceToPolylineM(nearCorner, polyline)).toBeLessThan(10);
  });

  it('no da velocidad sin intervalo de tiempo', () => {
    expect(speedMps({ point: SOL, at: 1000 }, { point: PLAZA_ESPANA, at: 1000 })).toBeNull();
  });

  it('calcula velocidad de conduccion urbana', () => {
    const speed = speedMps({ point: SOL, at: 0 }, { point: PLAZA_ESPANA, at: 180_000 });
    expect(speed).not.toBeNull();
    expect(speed!).toBeGreaterThan(5); // ~1 km en 3 min
    expect(speed!).toBeLessThan(7);
  });
});
