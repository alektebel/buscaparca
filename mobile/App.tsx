import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { DestinationScreen } from './src/screens/DestinationScreen';
import { ParkedScreen } from './src/screens/ParkedScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SessionProvider } from './src/state/session';
import { colors } from './src/theme';
import { flush } from './src/tracking/outbox';
import { requestPermissions, startTracking } from './src/tracking/background';

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, text: colors.text },
};

export default function App() {
  useEffect(() => {
    void (async () => {
      // Todo lo que aprende el sistema depende de esto, asi que se pide pronto y se explica por que.
      if (await requestPermissions()) await startTracking();
      await flush();
    })();
  }, []);

  return (
    <SessionProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={theme}>
        <Stack.Navigator initialRouteName="Destino">
          <Stack.Screen name="Destino" component={DestinationScreen} options={{ title: 'BuscaParca' }} />
          <Stack.Screen name="Plan" component={PlanScreen} />
          <Stack.Screen name="Buscar" component={SearchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Coche" component={ParkedScreen} options={{ title: 'Tu coche' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SessionProvider>
  );
}
