import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthService } from '../services/AuthService';
import { ParkingService } from '../services/ParkingService';
import ParkingMLModel from '../services/ParkingMLModel';
import DatabaseService from '../services/DatabaseService';
import { seedDemoData } from '../services/SeedService';

export default function MainScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [hotZones, setHotZones] = useState([]);
  const [bestParking, setBestParking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await loadUser();
    await initializeDatabase();
    await requestLocationPermission();
  };

  const loadUser = async () => {
    const result = await AuthService.checkSession();
    if (result.success) setUser(result.user);
  };

  const initializeDatabase = async () => {
    try {
      await DatabaseService.init();
      await ParkingMLModel.initialize();
      setDbInitialized(true);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      Alert.alert('Error', 'No se pudo inicializar la base de datos');
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se necesita acceso a la ubicación para encontrar estacionamiento');
        setLoading(false);
        return;
      }
      await getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLoading(false);
    }
  };


  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(userLocation);
      setMapRegion({
        ...userLocation,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });

      // Load hot zones
      await loadHotZones(userLocation.latitude, userLocation.longitude);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo obtener la ubicación');
      console.error('Error getting location:', error);
    }
  };

  const loadHotZones = async (lat, lon) => {
    if (!dbInitialized) return;
    try {
      const zones = await ParkingService.getHotZones(lat, lon, 2);
      setHotZones(zones);
      console.log(`Loaded ${zones.length} hot zones`);
    } catch (error) {
      console.error('Error loading hot zones:', error);
    }
  };

  const handleFindParking = async () => {
    if (!location) {
      Alert.alert('Error', 'Obteniendo ubicación...');
      return;
    }
    if (!dbInitialized) {
      Alert.alert('Error', 'Base de datos no inicializada');
      return;
    }

    setSearching(true);
    try {
      const parking = await ParkingService.getBestParkingOption(location);
      if (parking) {
        setBestParking(parking);
        Alert.alert(
          'Estacionamiento Encontrado',
          `${parking.name}\nProbabilidad: ${parking.probability}%\nDistancia: ${parking.distance}m`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Record this as a successful search
                if (user) {
                  ParkingService.recordParkingAttempt(user.username, location, true, 0);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Sin Resultados', 'No se encontraron zonas de estacionamiento cercanas');
      }
    } catch (error) {
      console.error('Error finding parking:', error);
      Alert.alert('Error', 'No se pudo buscar estacionamiento');
    }
    setSearching(false);
  };

  const handleLoadDemoData = async () => {
    if (!location) {
      Alert.alert('Error', 'Esperando ubicación...');
      return;
    }
    
    Alert.alert(
      'Cargar Datos de Demostración',
      '¿Deseas cargar datos de demostración? Esto creará zonas de estacionamiento alrededor de tu ubicación actual.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar',
          onPress: async () => {
            try {
              setLoading(true);
              await seedDemoData(location.latitude, location.longitude, user?.username || 'demo');
              await ParkingMLModel.updateModel();
              await loadHotZones(location.latitude, location.longitude);
              setLoading(false);
              Alert.alert('Éxito', 'Datos de demostración cargados correctamente');
            } catch (error) {
              setLoading(false);
              console.error('Error loading demo data:', error);
              Alert.alert('Error', 'No se pudieron cargar los datos de demostración');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const getProbabilityColor = (probability) => {
    if (probability > 0.65) return 'rgba(76, 175, 80,'; // green
    if (probability > 0.35) return 'rgba(255, 193, 7,'; // yellow
    return 'rgba(244, 67, 54,';                          // red
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Full-screen map */}
      {mapRegion ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Hot zones */}
          {hotZones.map((zone, index) => {
            const colorBase = getProbabilityColor(zone.probability);
            return (
              <Circle
                key={`zone_${index}`}
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={zone.radius || 100}
                fillColor={`${colorBase} 0.25)`}
                strokeColor={`${colorBase} 0.5)`}
                strokeWidth={2}
              />
            );
          })}

          {/* Best parking marker */}
          {bestParking && (
            <Marker
              coordinate={{
                latitude: bestParking.latitude,
                longitude: bestParking.longitude
              }}
              title={bestParking.name}
              description={`Probabilidad: ${bestParking.probability}%`}
              pinColor="blue"
            />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingMap}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
        </View>
      )}

      {/* Top overlay: user info + demo button */}
      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topCard}>
          <View style={styles.topCardLeft}>
            <Text style={styles.appName}>BuscaParca</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, dbInitialized ? styles.dotGreen : styles.dotRed]} />
              <Text style={styles.statusText}>
                {dbInitialized ? 'Listo' : 'Inicializando...'}
              </Text>
            </View>
          </View>
          <View style={styles.topButtons}>
            <TouchableOpacity style={styles.demoButton} onPress={handleLoadDemoData}>
              <Text style={styles.demoButtonText}>Demo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legend */}
        {hotZones.length > 0 && (
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>Probabilidad de encontrar lugar</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendLabel}>Alta (&gt;65%)</Text>
              <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
              <Text style={styles.legendLabel}>Media</Text>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendLabel}>Baja (&lt;35%)</Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Bottom overlay: APARCAR button */}
      <SafeAreaView style={styles.bottomOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.aparcarButton, (searching || loading) && styles.aparcarButtonDisabled]}
          onPress={handleFindParking}
          disabled={searching || loading}
        >
          {searching ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.aparcarText}>APARCAR</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8e8e8',
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  topCardLeft: {
    flex: 1,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  demoButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#F44336' },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  logoutText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  legendCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 11,
    color: '#555',
    marginRight: 8,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  aparcarButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#4A90E2',
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    minHeight: 72,
  },
  aparcarButtonDisabled: {
    backgroundColor: '#A0C4E8',
  },
  aparcarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
