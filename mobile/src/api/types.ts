/** Contrato con el backend. Espejo de `backend/app/schemas.py`. */

export type LonLat = [number, number];

export type SegmentPrediction = {
  segment_id: string;
  name: string;
  geometry: LonLat[];
  capacity: number;
  ser_zone: string | null;
  p_free: number;
  free_fraction: number;
  confidence: number;
};

export type PredictResponse = {
  at: string;
  traffic_pressure: number;
  segments: SegmentPrediction[];
};

export type PlanStep = {
  order: number;
  segment_id: string;
  name: string;
  geometry: LonLat[];
  p_free: number;
  confidence: number;
  walk_min: number;
  walk_m: number;
  price_eur: number;
  accept: boolean;
  accept_threshold_m: number;
  give_up: boolean;
};

export type PlanResponse = {
  destination: LonLat;
  at: string;
  accept_threshold_m: number;
  accept_anything: boolean;
  expected_minutes: number;
  expected_price_eur: number;
  p_street: number;
  give_up_after: number | null;
  fallback: { id: string; name: string; walk_min: number; price_eur: number };
  steps: PlanStep[];
};

export type GeocodeHit = { label: string; lat: number; lon: number };

export type EventKind = 'park' | 'unpark' | 'cruise_no_spot';

export type OutgoingEvent = {
  segment_id: string;
  kind: EventKind;
  at: string;
  exposure_min?: number;
};
