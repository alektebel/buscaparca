/**
 * Registro del seguimiento en segundo plano.
 *
 * Android lo permite con un servicio en primer plano y aviso visible, que es lo correcto: la app
 * dice todo el rato que esta mirando la ubicacion. iOS queda para mas adelante.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { snapToSegment, coarsenTimestamp } from './snap';
import { enqueue, flush } from './outbox';
import { initialState, step, type DetectorState, type Sample } from './parkDetector';
import type { OutgoingEvent, SegmentPrediction } from '../api/types';

export const LOCATION_TASK = 'buscaparca-location';
const STATE_KEY = 'buscaparca:detector';
const SEGMENTS_KEY = 'buscaparca:segments';

async function loadState(): Promise<DetectorState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return initialState();
  try {
    return JSON.parse(raw) as DetectorState;
  } catch {
    return initialState();
  }
}

async function saveState(state: DetectorState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/** Los tramos cacheados de la zona: sin ellos no se puede ajustar nada sin mandar coordenadas. */
export async function cacheSegments(segments: SegmentPrediction[]): Promise<void> {
  await AsyncStorage.setItem(SEGMENTS_KEY, JSON.stringify(segments));
}

async function cachedSegments(): Promise<SegmentPrediction[]> {
  const raw = await AsyncStorage.getItem(SEGMENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SegmentPrediction[];
  } catch {
    return [];
  }
}

export async function handleLocations(locations: Location.LocationObject[]): Promise<void> {
  if (locations.length === 0) return;

  let state = await loadState();
  const segments = await cachedSegments();
  const outgoing: OutgoingEvent[] = [];

  for (const location of locations) {
    const sample: Sample = {
      point: { lon: location.coords.longitude, lat: location.coords.latitude },
      at: location.timestamp,
      speedMps: location.coords.speed ?? undefined,
      accuracyM: location.coords.accuracy ?? undefined,
    };
    const result = step(state, sample);
    state = result.state;

    for (const event of result.events) {
      const segment = snapToSegment(event.point, segments);
      // Sin tramo conocido no se sube nada: antes perder el dato que mandar una coordenada suelta.
      if (!segment) continue;
      outgoing.push({
        segment_id: segment.segment_id,
        kind: event.kind,
        at: coarsenTimestamp(event.at),
      });
    }
  }

  await saveState(state);
  if (outgoing.length > 0) {
    await enqueue(outgoing);
    await flush();
  }
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  await handleLocations(locations);
});

export async function requestPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted';
}

export async function startTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 20_000,
    distanceInterval: 25,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    foregroundService: {
      notificationTitle: 'BuscaParca',
      notificationBody: 'Detectando cuando aparcas para saber donde hay huecos',
      notificationColor: '#1f6feb',
    },
  });
}

export async function stopTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export async function forgetEverything(): Promise<void> {
  await AsyncStorage.multiRemove([STATE_KEY, SEGMENTS_KEY]);
}
