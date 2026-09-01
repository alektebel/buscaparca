/**
 * Geometria minima en el telefono. Existe aqui, y no solo en el servidor, por una razon concreta:
 * el ajuste de una posicion a un tramo se hace en el dispositivo para que la traza GPS no salga
 * nunca de el. Ver docs/PRIVACIDAD.md.
 */

export type Point = { lon: number; lat: number };

const EARTH_RADIUS_M = 6_371_000;

export function haversineM(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Proyeccion local plana en metros alrededor de `origin`. A escala de calle el error es ridiculo. */
function toLocalMetres(origin: Point, p: Point): [number, number] {
  const metresPerDegLat = 111_320;
  const metresPerDegLon = metresPerDegLat * Math.cos((origin.lat * Math.PI) / 180);
  return [(p.lon - origin.lon) * metresPerDegLon, (p.lat - origin.lat) * metresPerDegLat];
}

/** Distancia de un punto al tramo recto a-b, en metros. */
export function distanceToSegmentM(point: Point, a: Point, b: Point): number {
  const [px, py] = toLocalMetres(point, point);
  const [ax, ay] = toLocalMetres(point, a);
  const [bx, by] = toLocalMetres(point, b);

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);

  // Proyeccion sobre el tramo, recortada a [0, 1] para no salirse de sus extremos.
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distancia de un punto a una polilinea, en metros. */
export function distanceToPolylineM(point: Point, polyline: Point[]): number {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY;
  if (polyline.length === 1) return haversineM(point, polyline[0]!);

  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    best = Math.min(best, distanceToSegmentM(point, polyline[i]!, polyline[i + 1]!));
  }
  return best;
}

/** Velocidad entre dos muestras, en m/s. Devuelve null si el intervalo no es utilizable. */
export function speedMps(
  from: { point: Point; at: number },
  to: { point: Point; at: number },
): number | null {
  const seconds = (to.at - from.at) / 1000;
  if (seconds <= 0) return null;
  return haversineM(from.point, to.point) / seconds;
}
