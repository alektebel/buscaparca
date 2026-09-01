/**
 * El unico ajuste que se le pide al conductor.
 *
 * No es un adorno: los pesos del problema de parada optima salen literalmente de aqui. Se ofrece
 * como tres botones y no como un deslizador porque esto se toca con el coche en marcha.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

const OPTIONS: { label: string; hint: string; value: number }[] = [
  { label: 'Sin prisa', hint: 'ando lo que haga falta', value: 0.15 },
  { label: 'Normal', hint: 'lo razonable', value: 0.5 },
  { label: 'Aparca ya', hint: 'me da igual pagar', value: 0.9 },
];

export function HurryPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const selected = Math.abs(option.value - value) < 0.2;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.option, selected && styles.selected]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
            <Text style={styles.hint}>{option.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.surfaceAlt },
  label: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  labelSelected: { color: colors.text },
  hint: { color: colors.textDim, fontSize: 11, marginTop: 2 },
});
