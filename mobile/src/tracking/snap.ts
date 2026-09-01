/**
 * Ajuste de una posicion al tramo de calle mas cercano, **en el telefono**.
 *
 * Es la pieza que hace que el sistema pueda aprender sin recoger recorridos: al servidor solo
 * sube el identificador del tramo y la hora redondeada. La posicion exacta, la trayectoria y todo
 * lo que se puede deducir de ellas no salen de aqui.
 */

import { distanceToPolylineM, type Point } from '../geo';
import type { SegmentPrediction } from '../api/types';

/** Mas lejos que esto, la posicion no pertenece de forma creible a ninguna calle conocida. */
export const MAX_SNAP_M = 35;

export function snapToSegment(
  point: Point,
  segments: SegmentPrediction[],
  maxDistanceM: number = MAX_SNAP_M,
): SegmentPrediction | null {
  let best: SegmentPrediction | null = null;
  let bestDistance = maxDistanceM;

  for (const segment of segments) {
    const polyline = segment.geometry.map(([lon, lat]) => ({ lon, lat }));
    const distance = distanceToPolylineM(point, polyline);
    if (distance < bestDistance) {
      best = segment;
      bestDistance = distance;
    }
  }
  return best;
}

/** Redondea al bloque de 5 minutos: la hora exacta tampoco hace falta para nada. */
export function coarsenTimestamp(at: number, blockMs = 5 * 60_000): string {
  return new Date(Math.floor(at / blockMs) * blockMs).toISOString();
}
