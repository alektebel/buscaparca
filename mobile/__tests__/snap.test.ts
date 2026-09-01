import { coarsenTimestamp, snapToSegment } from '../src/tracking/snap';
import type { SegmentPrediction } from '../src/api/types';

function segment(id: string, geometry: [number, number][]): SegmentPrediction {
  return {
    segment_id: id,
    name: id,
    geometry,
    capacity: 20,
    ser_zone: 'azul',
    p_free: 0.2,
    free_fraction: 0.01,
    confidence: 0.5,
  };
}

const FUENCARRAL = segment('fuencarral', [
  [-3.7013, 40.4250],
  [-3.7013, 40.4270],
]);
const HORTALEZA = segment('hortaleza', [
  [-3.6985, 40.4250],
  [-3.6985, 40.4270],
]);

describe('ajuste al tramo, en el telefono', () => {
  it('elige la calle en la que estas', () => {
    const onFuencarral = { lon: -3.70131, lat: 40.4260 };
    expect(snapToSegment(onFuencarral, [FUENCARRAL, HORTALEZA])?.segment_id).toBe('fuencarral');
  });

  it('no ajusta nada si no hay una calle creible cerca', () => {
    const middleOfNowhere = { lon: -3.6800, lat: 40.4600 };
    expect(snapToSegment(middleOfNowhere, [FUENCARRAL, HORTALEZA])).toBeNull();
  });

  it('respeta el radio maximo', () => {
    const slightlyOff = { lon: -3.70160, lat: 40.4260 }; // ~25 m
    expect(snapToSegment(slightlyOff, [FUENCARRAL])).not.toBeNull();
    expect(snapToSegment(slightlyOff, [FUENCARRAL], 10)).toBeNull();
  });

  it('redondea la hora a bloques de cinco minutos', () => {
    const at = Date.UTC(2026, 8, 3, 20, 37, 42, 500);
    expect(coarsenTimestamp(at)).toBe('2026-09-03T20:35:00.000Z');
  });
});
