import Constants from 'expo-constants';

import type {
  GeocodeHit,
  OutgoingEvent,
  PlanResponse,
  PredictResponse,
} from './types';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://10.0.2.2:8000';

const TIMEOUT_MS = 12_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!response.ok) {
      throw new Error(`${path} -> HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function predict(
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number },
  at?: Date,
): Promise<PredictResponse> {
  const params = new URLSearchParams({
    min_lon: String(bbox.minLon),
    min_lat: String(bbox.minLat),
    max_lon: String(bbox.maxLon),
    max_lat: String(bbox.maxLat),
  });
  if (at) params.set('at', at.toISOString());
  return request<PredictResponse>(`/v1/predict?${params.toString()}`);
}

export function plan(body: {
  lat: number;
  lon: number;
  arrive_at?: string;
  hurry: number;
  stay_hours: number;
}): Promise<PlanResponse> {
  return request<PlanResponse>('/v1/plan', { method: 'POST', body: JSON.stringify(body) });
}

export function geocode(query: string): Promise<GeocodeHit[]> {
  return request<GeocodeHit[]>(`/v1/geocode?q=${encodeURIComponent(query)}`);
}

export function sendEvents(events: OutgoingEvent[]): Promise<{ accepted: number }> {
  return request<{ accepted: number }>('/v1/events', {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
}
