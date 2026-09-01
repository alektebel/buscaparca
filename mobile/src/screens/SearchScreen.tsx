/**
 * La pantalla que se usa con el coche en marcha.
 *
 * Una sola frase, enorme, y nada mas: o coges el hueco o no. La decision se recalcula con tu
 * posicion real, porque el umbral del problema de parada optima cambia segun por donde vas: cuanto
 * mas te alejas del destino, mas te compensa aceptar lo que salga.
 *
 * Ademas se dice en voz alta, porque nadie deberia estar leyendo el movil conduciendo.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

import { distanceToPolylineM, haversineM } from '../geo';
import { useSession } from '../state/session';
import { colors, spacing } from '../theme';
import type { PlanStep } from '../api/types';

export function SearchScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const { plan, markParked } = useSession();
  const [nearest, setNearest] = useState<PlanStep | null>(null);
  const [distanceToDestM, setDistanceToDestM] = useState<number | null>(null);
  const lastSpoken = useRef<string | null>(null);

  useEffect(() => {
    if (!plan) return;
    let subscription: Location.LocationSubscription | undefined;

    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15 },
        (position) => {
          const here = { lon: position.coords.longitude, lat: position.coords.latitude };
          const [destLon, destLat] = plan.destination;
          setDistanceToDestM(haversineM(here, { lon: destLon, lat: destLat }));

          let best: PlanStep | null = null;
          let bestDistance = 60;
          for (const step of plan.steps) {
            const polyline = step.geometry.map(([lon, lat]) => ({ lon, lat }));
            const distance = distanceToPolylineM(here, polyline);
            if (distance < bestDistance) {
              best = step;
              bestDistance = distance;
            }
          }
          setNearest(best);
        },
      );
    })();

    return () => subscription?.remove();
  }, [plan]);

  const accepting = decideAccepting(plan?.accept_anything ?? false, nearest, distanceToDestM);
  const message = accepting
    ? 'Coge el primer hueco'
    : nearest
      ? 'Sigue, aun no'
      : 'Ve hacia el destino';

  useEffect(() => {
    if (message !== lastSpoken.current) {
      lastSpoken.current = message;
      Speech.speak(message, { language: 'es-ES' });
    }
  }, [message]);

  if (!plan) {
    return (
      <View style={styles.centred}>
        <Text style={styles.dim}>No hay plan activo.</Text>
      </View>
    );
  }

  const giveUpStep =
    plan.give_up_after !== null ? (plan.steps[plan.give_up_after] ?? null) : null;
  const passedGiveUp = giveUpStep != null && nearest != null && nearest.order >= giveUpStep.order;

  return (
    <View style={[styles.screen, accepting ? styles.screenGo : styles.screenWait]}>
      <Text style={styles.message}>{message.toUpperCase()}</Text>

      <Text style={styles.where}>
        {nearest ? nearest.name : 'fuera del recorrido'}
        {distanceToDestM !== null ? ` · ${Math.round(distanceToDestM)} m del destino` : ''}
      </Text>

      {passedGiveUp ? (
        <View style={styles.giveUpBox}>
          <Text style={styles.giveUpText}>
            Ya no compensa seguir dando vueltas. Tira para {plan.fallback.name}.
          </Text>
        </View>
      ) : null}

      <Pressable
        style={styles.parked}
        onPress={() => {
          markParked(nearest?.name ?? 'aqui');
          navigation.navigate('Coche');
        }}
      >
        <Text style={styles.parkedLabel}>He aparcado</Text>
      </Pressable>

      <Text style={styles.footnote}>
        Si no le das, la app lo detecta sola en cuanto te alejes andando.
      </Text>
    </View>
  );
}

/**
 * La regla de umbral del planificador, aplicada a donde estas ahora.
 *
 * `accept_threshold_m` de cada paso es la distancia maxima al destino que compensa aceptar estando
 * en ese punto del recorrido. Si estas mas cerca que eso, para en cuanto veas algo.
 */
export function decideAccepting(
  acceptAnything: boolean,
  nearest: PlanStep | null,
  distanceToDestM: number | null,
): boolean {
  if (acceptAnything) return true;
  if (!nearest || distanceToDestM === null) return false;
  return distanceToDestM <= nearest.accept_threshold_m;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  screenGo: { backgroundColor: '#0b3d1a' },
  screenWait: { backgroundColor: colors.bg },
  centred: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  message: { color: '#fff', fontSize: 44, fontWeight: '800', textAlign: 'center', lineHeight: 50 },
  where: { color: colors.textDim, fontSize: 18, textAlign: 'center' },
  giveUpBox: {
    backgroundColor: colors.warn,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  giveUpText: { color: '#1a1200', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  parked: {
    marginTop: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  parkedLabel: { color: colors.text, fontSize: 20, fontWeight: '700' },
  footnote: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  dim: { color: colors.textDim },
});
