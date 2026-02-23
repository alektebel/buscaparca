import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthService } from '../services/AuthService';
import { ApiService } from '../services/ApiService';

const { width, height } = Dimensions.get('window');

export default function MainScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [bestParking, setBestParking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [hotZones, setHotZones] = useState([]);
  const [nearbyParkingZones, setNearbyParkingZones] = useState([]);
  const [hasDemoData, setHasDemoData] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const locationWatchRef = useRef(null);
  const trajectoryIntervalRef = useRef(null);

  useEffect(() => {
    loadUser();
    testServerConnection();
    requestLocationPermission();
    
    // Cleanup on unmount
    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
      if (trajectoryIntervalRef.current) {
        clearInterval(trajectoryIntervalRef.current);
      }
    };
  }, []);

  const testServerConnection = async () => {
    const connected = await ApiService.testConnection();
    setServerConnected(connected);
    if (!connected) {
      Alert.alert(
        'Servidor No Disponible',
        'No se pudo conectar al servidor. Asegúrate de que el servidor esté ejecutándose en tu computadora.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadUser = async () => {
    const result = await AuthService.checkSession();
    if (result.success) {
      setUser(result.user);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Se necesita acceso a la ubicación para encontrar estacionamiento'
        );
        return;
      }
      await getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
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
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Load hot zones for this area
      await loadHotZones(userLocation.latitude, userLocation.longitude);

      // Start tracking user trajectory
      startTrajectoryTracking();

      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo obtener la ubicación');
      console.error('Error getting location:', error);
    }
  };

  const loadHotZones = async (lat, lon) => {
    if (!serverConnected) {
      console.log('Server not connected, skipping hot zones');
      return;
    }

    try {
      const zones = await ApiService.getHotZones(lat, lon, 2);
      setHotZones(zones);
      setHasDemoData(zones.length > 0);
      
      // Also get nearby parking zones for markers
      const nearbyZones = zones
        .filter(zone => zone.successRate > 0.5)
        .slice(0, 10)
        .map((zone, index) => ({
          id: `zone_${index}`,
          ...zone,
          name: `Zona ${index + 1}`,
          probability: Math.round(zone.successRate * 100)
        }));
      
      setNearbyParkingZones(nearbyZones);
    } catch (error) {
      console.error('Error loading hot zones:', error);
    }
  };

  const handleSeedDemoData = async () => {
    if (!location) {
      Alert.alert('Error', 'Esperando ubicación...');
      return;
    }

    if (!serverConnected) {
      Alert.alert('Error', 'El servidor no está disponible');
      return;
    }

    Alert.alert(
      'Cargar Datos Demo',
      '¿Deseas cargar datos de ejemplo en el servidor para visualizar zonas calientes? Esto creará eventos de estacionamiento simulados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar',
          onPress: async () => {
            setLoading(true);
            try {
              await ApiService.seedDemoData(location.latitude, location.longitude, user?.username || 'demo');
              await loadHotZones(location.latitude, location.longitude);
              Alert.alert('Éxito', 'Datos de demostración cargados en el servidor. ¡Ahora puedes ver las zonas calientes en el mapa!');
            } catch (error) {
              Alert.alert('Error', 'No se pudieron cargar los datos demo');
              console.error('Error seeding demo data:', error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const startTrajectoryTracking = () => {
    if (!serverConnected) {
      console.log('Server not connected, skipping trajectory tracking');
      return;
    }

    // Record trajectory every 30 seconds
    trajectoryIntervalRef.current = setInterval(async () => {
      if (location && user) {
        try {
          const currentPos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          await ApiService.recordTrajectory(user.username, {
            latitude: currentPos.coords.latitude,
            longitude: currentPos.coords.longitude,
            speed: currentPos.coords.speed,
            heading: currentPos.coords.heading,
            accuracy: currentPos.coords.accuracy
          });
        } catch (error) {
          console.error('Error recording trajectory:', error);
        }
      }
    }, 30000); // 30 seconds
  };

  const handleFindParking = async () => {
    if (!location) {
      Alert.alert('Error', 'Obteniendo ubicación...');
      return;
    }

    if (!serverConnected) {
      Alert.alert('Error', 'El servidor no está disponible');
      return;
    }

    setSearching(true);
    const searchStartTime = Date.now();

    try {
      const result = await ApiService.findParking(location.latitude, location.longitude, 1000);
      const parking = result.bestOption;
      
      if (parking) {
        setBestParking(parking);
        
        // Center map on parking location
        setMapRegion({
          latitude: parking.latitude,
          longitude: parking.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        Alert.alert(
          '¡Estacionamiento Encontrado!',
          `${parking.name}\n` +
          `Distancia: ${parking.distance}m\n` +
          `Tipo: ${parking.type}\n` +
          `Probabilidad: ${parking.probability}%`,
          [
            { 
              text: 'No encontré lugar', 
              style: 'cancel',
              onPress: () => {
                const searchDuration = Math.floor((Date.now() - searchStartTime) / 1000);
                ApiService.recordParkingEvent(
                  user?.username || 'guest',
                  { latitude: parking.latitude, longitude: parking.longitude },
                  false,
                  searchDuration
                );
              }
            },
            { 
              text: 'Estacioné aquí',
              onPress: () => {
                const searchDuration = Math.floor((Date.now() - searchStartTime) / 1000);
                ApiService.recordParkingEvent(
                  user?.username || 'guest',
                  { latitude: parking.latitude, longitude: parking.longitude },
                  true,
                  searchDuration
                );
                Alert.alert('¡Genial!', 'Tu experiencia ayudará a mejorar las predicciones');
              }
            }
          ]
        );
      } else {
        Alert.alert('Lo sentimos', 'No se encontraron estacionamientos cercanos. Intenta cargar datos demo primero.');
      }
    } catch (error) {
      console.error('Error finding parking:', error);
      Alert.alert('Error', 'Hubo un problema al buscar estacionamiento');
    } finally {
      setSearching(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bienvenido</Text>
          <Text style={styles.userText}>{user?.username || 'Usuario'}</Text>
          <View style={styles.serverStatus}>
            <View style={[styles.statusDot, serverConnected ? styles.statusConnected : styles.statusDisconnected]} />
            <Text style={styles.statusText}>
              {serverConnected ? 'Servidor conectado' : 'Servidor desconectado'}
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          {!hasDemoData && !loading && serverConnected && (
            <TouchableOpacity style={styles.demoButton} onPress={handleSeedDemoData}>
              <Text style={styles.demoButtonText}>Demo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {loading || !mapRegion ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {location && (
              <Circle
                center={location}
                radius={500}
                fillColor="rgba(74, 144, 226, 0.1)"
                strokeColor="rgba(74, 144, 226, 0.3)"
                strokeWidth={2}
              />
            )}
            
            {/* Hot zones visualization */}
            {hotZones.map((zone, index) => {
              // Color based on success rate (green = good, yellow = medium, red = poor)
              let color = 'rgba(255, 193, 7, 0.3)'; // yellow
              if (zone.successRate > 0.7) {
                color = 'rgba(76, 175, 80, 0.4)'; // green
              } else if (zone.successRate < 0.4) {
                color = 'rgba(244, 67, 54, 0.3)'; // red
              }

              return (
                <Circle
                  key={`hotzone_${index}`}
                  center={{
                    latitude: zone.latitude,
                    longitude: zone.longitude
                  }}
                  radius={zone.radius}
                  fillColor={color}
                  strokeColor={color.replace('0.3', '0.6').replace('0.4', '0.7')}
                  strokeWidth={1}
                />
              );
            })}

            {/* Nearby parking zone markers */}
            {nearbyParkingZones.map((zone) => (
              <Marker
                key={zone.id}
                coordinate={{
                  latitude: zone.latitude,
                  longitude: zone.longitude,
                }}
                title={zone.name}
                description={`Probabilidad: ${zone.probability}%`}
                pinColor={zone.successRate > 0.7 ? '#4CAF50' : '#FFC107'}
              />
            ))}
            
            {bestParking && (
              <Marker
                coordinate={{
                  latitude: bestParking.latitude,
                  longitude: bestParking.longitude,
                }}
                title={bestParking.name}
                description={`Probabilidad: ${bestParking.probability}%`}
                pinColor="#4A90E2"
              />
            )}
          </MapView>
        )}
      </View>

      {bestParking && (
        <View style={styles.probabilityCard}>
          <Text style={styles.probabilityLabel}>Probabilidad de Estacionamiento</Text>
          <Text style={styles.probabilityValue}>{bestParking.probability}%</Text>
          <Text style={styles.parkingName}>{bestParking.name}</Text>
          <Text style={styles.parkingDistance}>{bestParking.distance}m de distancia</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.aparcarButton, searching && styles.aparcarButtonDisabled]}
          onPress={handleFindParking}
          disabled={searching || loading}
        >
          {searching ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.aparcarText}>APARCAR</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  userText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 11,
    color: '#666',
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  logoutText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  probabilityCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  probabilityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  probabilityValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 10,
  },
  parkingName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  parkingDistance: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  aparcarButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 25,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    minHeight: 80,
  },
  aparcarButtonDisabled: {
    backgroundColor: '#A0C4E8',
  },
  aparcarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
