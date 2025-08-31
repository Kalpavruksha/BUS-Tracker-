import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Logo from '../../components/Logo';
import locationService from '../../services/locationService';

const DriverDashboard = ({ route, navigation }) => {
  const { busId } = route.params;
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeStops, setRouteStops] = useState([]);

  useEffect(() => {
    // Load route stops (this would typically come from your backend)
    const stops = [
      { latitude: 12.9716, longitude: 77.5946, name: 'College' },
      { latitude: 12.9784, longitude: 77.6408, name: 'Market' },
      { latitude: 12.9773, longitude: 77.5663, name: 'City Center' },
    ];
    setRouteStops(stops);
  }, []);

  const handleStartTracking = async () => {
    try {
      await locationService.startTracking(busId);
      setIsTracking(true);
      Alert.alert('Success', 'Location tracking started');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleStopTracking = () => {
    locationService.stopTracking();
    setIsTracking(false);
    Alert.alert('Success', 'Location tracking stopped');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Logo size="small" />
        <Text style={styles.busInfo}>Bus ID: {busId}</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: routeStops[0]?.latitude || 12.9716,
            longitude: routeStops[0]?.longitude || 77.5946,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {/* Route stops */}
          {routeStops.map((stop, index) => (
            <Marker
              key={`stop-${index}`}
              coordinate={{
                latitude: stop.latitude,
                longitude: stop.longitude,
              }}
              title={stop.name}
              pinColor="#007AFF"
            />
          ))}

          {/* Route line */}
          {routeStops.length > 1 && (
            <Polyline
              coordinates={routeStops}
              strokeColor="#007AFF"
              strokeWidth={3}
            />
          )}

          {/* Current location */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Current Location"
              pinColor="#FF0000"
            />
          )}
        </MapView>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isTracking ? '#FF3B30' : '#007AFF' }
          ]}
          onPress={isTracking ? handleStopTracking : handleStartTracking}
        >
          <Text style={styles.buttonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={() => navigation.replace('DriverLogin')}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  busInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  map: {
    flex: 1,
  },
  controls: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DriverDashboard; 