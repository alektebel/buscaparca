/**
 * El plan: por donde pasar, en que orden, y cuando dejar de intentarlo.
 *
 * El mapa colorea cada tramo por probabilidad, pero el dato que de verdad decide es el numero
 * grande de arriba: el radio de aceptacion. Todo lo demas es contexto.
 */

import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';

import { cacheSegments } from '../tracking/background';
import { useSession } from '../state/session';
import { colors, heatColor, spacing } from '../theme';

export function PlanScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const { destination, plan, loading, error, refreshPlan } = useSession();

  useEffect(() => {
    // Los tramos del plan se guardan en el telefono: son los que permiten ajustar una posicion a
    // una calle sin mandar coordenadas a ningun sitio.
    if (plan) {
      void cacheSegments(
        plan.steps.map((step) => ({
          segment_id: step.segment_id,
          name: step.name,
          geometry: step.geometry,
          capacity: 0,
          ser_zone: null,
          p_free: step.p_free,
          free_fraction: 0,
          confidence: step.confidence,
        })),
      );
    }
  }, [plan]);

  if (!destination) {
    return (
      <View style={styles.centred}>
        <Text style={styles.dim}>Elige primero un destino.</Text>
      </View>
    );
  }

  if (loading || !plan) {
    return (
      <View style={styles.centred}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
        <Pressable style={styles.retry} onPress={refreshPlan}>
          <Text style={styles.retryLabel}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const [destLon, destLat] = plan.destination;

  return (
    <View style={styles.screen}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: destLat,
          longitude: destLon,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
      >
        <Circle
          center={{ latitude: destLat, longitude: destLon }}
          radius={plan.accept_threshold_m}
          strokeColor={colors.accent}
          fillColor="rgba(31,111,235,0.10)"
        />
        {plan.steps.map((step) => (
          <Polyline
            key={step.segment_id}
            coordinates={step.geometry.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))}
            strokeColor={heatColor(step.p_free)}
            strokeWidth={6}
          />
        ))}
        <Marker coordinate={{ latitude: destLat, longitude: destLon }} title={destination.label} />
      </MapView>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <Text style={styles.headline}>
          {plan.accept_anything
            ? 'Coge el primer hueco que veas'
            : `Acepta cualquier hueco a menos de ${Math.round(plan.accept_threshold_m)} m`}
        </Text>

        <View style={styles.stats}>
          <Stat label="tardaras" value={`${plan.expected_minutes.toFixed(0)} min`} />
          <Stat label="pagaras" value={`${plan.expected_price_eur.toFixed(2)} €`} />
          <Stat label="en la calle" value={`${Math.round(plan.p_street * 100)} %`} />
        </View>

        {plan.give_up_after !== null ? (
          <Text style={styles.giveUp}>
            Si a la altura de {plan.steps[plan.give_up_after]?.name ?? 'ese punto'} sigues sin nada,
            deja de buscar y tira para {plan.fallback.name} ({plan.fallback.price_eur.toFixed(2)} €,
            {' '}{plan.fallback.walk_min.toFixed(0)} min andando).
          </Text>
        ) : (
          <Text style={styles.giveUp}>
            Merece la pena buscar en la calle. Si se agota el recorrido, {plan.fallback.name}.
          </Text>
        )}

        <Pressable style={styles.start} onPress={() => navigation.navigate('Buscar')}>
          <Text style={styles.startLabel}>Empezar a buscar</Text>
        </Pressable>

        <Text style={styles.section}>Por este orden</Text>
        {plan.steps.slice(0, 8).map((step) => (
          <View key={step.segment_id} style={styles.step}>
            <View style={[styles.dot, { backgroundColor: heatColor(step.p_free) }]} />
            <Text style={styles.stepName} numberOfLines={1}>
              {step.name}
            </Text>
            <Text style={styles.stepMeta}>
              {Math.round(step.p_free * 100)}% · {Math.round(step.walk_m)} m
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centred: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  map: { flex: 1 },
  panel: { maxHeight: '52%', backgroundColor: colors.bg },
  panelContent: { padding: spacing.md, gap: spacing.sm },
  headline: { color: colors.text, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '700' },
  statLabel: { color: colors.textDim, fontSize: 12 },
  giveUp: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  start: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  startLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  section: {
    color: colors.textDim,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stepName: { color: colors.text, flex: 1, fontSize: 15 },
  stepMeta: { color: colors.textDim, fontSize: 13 },
  dim: { color: colors.textDim },
  error: { color: colors.bad, paddingHorizontal: spacing.lg, textAlign: 'center' },
  retry: { padding: spacing.md },
  retryLabel: { color: colors.accent, fontWeight: '600' },
});
