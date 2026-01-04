import React, { useState, useEffect } from 'react';
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
import { ParkingService } from '../services/ParkingService';

const { width, height } = Dimensions.get('window');

export default function MainScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [bestParking, setBestParking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    loadUser();
    requestLocationPermission();
  }, []);

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

      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo obtener la ubicación');
      console.error('Error getting location:', error);
    }
  };

  const handleFindParking = async () => {
    if (!location) {
      Alert.alert('Error', 'Obteniendo ubicación...');
      return;
    }

    setSearching(true);

    // Simulate search delay
    setTimeout(() => {
      const parking = ParkingService.getBestParkingOption(location);
      
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
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Lo sentimos', 'No se encontraron estacionamientos cercanos');
      }

      setSearching(false);
    }, 1500);
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
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
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
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  userText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
