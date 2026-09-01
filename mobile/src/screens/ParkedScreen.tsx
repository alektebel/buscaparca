/** Donde dejaste el coche y hasta cuando tienes pagado el SER. */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flush, pendingCount } from '../tracking/outbox';
import { useSession } from '../state/session';
import { colors, spacing } from '../theme';

export function ParkedScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const { parkedAt, stayHours, clearParked } = useSession();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    void (async () => {
      await flush();
      setPending(await pendingCount());
    })();
  }, []);

  if (!parkedAt) {
    return (
      <View style={styles.centred}>
        <Text style={styles.dim}>El coche no esta aparcado (que sepamos).</Text>
      </View>
    );
  }

  const expiresAt = new Date(parkedAt.at + stayHours * 3_600_000);

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Coche aparcado en</Text>
      <Text style={styles.street}>{parkedAt.segmentName}</Text>
      <Text style={styles.label}>Ticket hasta</Text>
      <Text style={styles.time}>
        {expiresAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => {
          clearParked();
          navigation.navigate('Destino');
        }}
      >
        <Text style={styles.buttonLabel}>He recogido el coche</Text>
      </Pressable>

      {pending > 0 ? (
        <Text style={styles.dim}>{pending} observaciones esperando cobertura para subir.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.sm },
  centred: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.textDim, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.md },
  street: { color: colors.text, fontSize: 30, fontWeight: '700' },
  time: { color: colors.text, fontSize: 44, fontWeight: '800' },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dim: { color: colors.textDim, marginTop: spacing.md },
});
