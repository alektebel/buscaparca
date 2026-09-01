/** Estado de la sesion de busqueda. Un contexto basta: la app tiene una sola cosa en marcha. */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import * as api from '../api/client';
import type { PlanResponse } from '../api/types';

export type Destination = { label: string; lat: number; lon: number };

type SessionValue = {
  destination: Destination | null;
  plan: PlanResponse | null;
  hurry: number;
  stayHours: number;
  loading: boolean;
  error: string | null;
  parkedAt: { segmentName: string; at: number } | null;
  setDestination: (destination: Destination) => void;
  setHurry: (hurry: number) => void;
  setStayHours: (hours: number) => void;
  refreshPlan: () => Promise<void>;
  markParked: (segmentName: string) => void;
  clearParked: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [destination, setDestinationState] = useState<Destination | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [hurry, setHurry] = useState(0.5);
  const [stayHours, setStayHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parkedAt, setParkedAt] = useState<{ segmentName: string; at: number } | null>(null);

  const refreshPlan = useCallback(async () => {
    if (!destination) return;
    setLoading(true);
    setError(null);
    try {
      // Se predice para la hora de LLEGADA, no para ahora: en diez minutos la calle es otra.
      const arriveAt = new Date(Date.now() + 10 * 60_000).toISOString();
      setPlan(
        await api.plan({
          lat: destination.lat,
          lon: destination.lon,
          arrive_at: arriveAt,
          hurry,
          stay_hours: stayHours,
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'no se pudo calcular el plan');
    } finally {
      setLoading(false);
    }
  }, [destination, hurry, stayHours]);

  const setDestination = useCallback((next: Destination) => {
    setDestinationState(next);
    setPlan(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      destination,
      plan,
      hurry,
      stayHours,
      loading,
      error,
      parkedAt,
      setDestination,
      setHurry,
      setStayHours,
      refreshPlan,
      markParked: (segmentName: string) => setParkedAt({ segmentName, at: Date.now() }),
      clearParked: () => setParkedAt(null),
    }),
    [destination, plan, hurry, stayHours, loading, error, parkedAt, setDestination, refreshPlan],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession fuera de SessionProvider');
  return value;
}
