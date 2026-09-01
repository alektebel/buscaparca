/**
 * Cola de salida de eventos. Aparcar en un sotano sin cobertura es lo normal, no la excepcion,
 * asi que los eventos se guardan y se reintentan; nunca se pierden por estar sin red.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { sendEvents } from '../api/client';
import type { OutgoingEvent } from '../api/types';

const KEY = 'buscaparca:outbox';
const MAX_QUEUED = 500;

async function read(): Promise<OutgoingEvent[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutgoingEvent[];
  } catch {
    return [];
  }
}

async function write(events: OutgoingEvent[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_QUEUED)));
}

export async function enqueue(events: OutgoingEvent[]): Promise<void> {
  if (events.length === 0) return;
  await write([...(await read()), ...events]);
}

/** Intenta vaciar la cola. Si falla, los eventos siguen ahi para el proximo intento. */
export async function flush(): Promise<number> {
  const pending = await read();
  if (pending.length === 0) return 0;
  try {
    const { accepted } = await sendEvents(pending);
    await write([]);
    return accepted;
  } catch {
    return 0;
  }
}

export async function pendingCount(): Promise<number> {
  return (await read()).length;
}

/** Borrado a peticion del usuario: lo que aun no ha salido del telefono, no sale. */
export async function clear(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
