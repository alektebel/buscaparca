/** ¿A donde vas? Todo lo demas se calcula para el destino, no para donde estas ahora. */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import * as api from '../api/client';
import { HurryPicker } from '../components/HurryPicker';
import { useSession } from '../state/session';
import { colors, spacing } from '../theme';
import type { GeocodeHit } from '../api/types';

export function DestinationScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const { setDestination, hurry, setHurry, stayHours, setStayHours, refreshPlan, loading } =
    useSession();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);

  async function search() {
    if (query.trim().length < 3) return;
    setSearching(true);
    try {
      setHits(await api.geocode(query.trim()));
    } catch {
      Alert.alert('No se pudo buscar', 'Revisa la conexion con el servidor.');
    } finally {
      setSearching(false);
    }
  }

  async function choose(label: string, lat: number, lon: number) {
    setDestination({ label, lat, lon });
    await refreshPlan();
    navigation.navigate('Plan');
  }

  async function useCurrentPosition() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Sin permiso de ubicacion', 'Escribe la direccion a mano.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    await choose('Aqui cerca', position.coords.latitude, position.coords.longitude);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>¿A donde vas?</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Calle, plaza o sitio"
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={search} accessibilityRole="button">
          {searching ? <ActivityIndicator color={colors.text} /> : <Text style={styles.searchLabel}>Buscar</Text>}
        </Pressable>
      </View>

      {hits.map((hit) => (
        <Pressable
          key={`${hit.lat},${hit.lon}`}
          style={styles.hit}
          onPress={() => choose(hit.label, hit.lat, hit.lon)}
        >
          <Text style={styles.hitLabel} numberOfLines={2}>
            {hit.label}
          </Text>
        </Pressable>
      ))}

      <Pressable style={styles.here} onPress={useCurrentPosition} accessibilityRole="button">
        <Text style={styles.hereLabel}>Aparcar aqui cerca</Text>
      </Pressable>

      <Text style={styles.section}>¿Cuanta prisa tienes?</Text>
      <HurryPicker value={hurry} onChange={setHurry} />

      <Text style={styles.section}>¿Cuanto te quedas?</Text>
      <View style={styles.stayRow}>
        {[1, 2, 4, 8].map((hours) => (
          <Pressable
            key={hours}
            style={[styles.stay, stayHours === hours && styles.staySelected]}
            onPress={() => setStayHours(hours)}
          >
            <Text style={[styles.stayLabel, stayHours === hours && styles.stayLabelSelected]}>
              {hours} h
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator style={styles.spinner} color={colors.accent} /> : null}

      <Text style={styles.footnote}>
        La app detecta sola cuando aparcas y cuando te vas, para saber donde hay huecos. Solo sube
        el tramo de calle y la hora redondeada: tu recorrido no sale del telefono.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  searchButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  searchLabel: { color: '#fff', fontWeight: '600' },
  hit: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hitLabel: { color: colors.text, fontSize: 14 },
  here: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  hereLabel: { color: colors.textDim, fontSize: 15 },
  section: { color: colors.textDim, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  stayRow: { flexDirection: 'row', gap: spacing.sm },
  stay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  staySelected: { borderColor: colors.accent, backgroundColor: colors.surfaceAlt },
  stayLabel: { color: colors.textDim, fontWeight: '600' },
  stayLabelSelected: { color: colors.text },
  spinner: { marginTop: spacing.md },
  footnote: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginTop: spacing.lg },
});
