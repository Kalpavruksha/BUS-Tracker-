import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import WebSocketService from '../services/websocketService';
import LocationService from '../services/locationService';

const BusMap = ({ usn }) => {
  const [busLocations, setBusLocations] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = WebSocketService.connect('ws://localhost:3000');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setBusLocations(prev => ({
          ...prev,
          [data.usn]: {
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            heading: data.heading,
            timestamp: data.timestamp
          }
        }));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    // Start location tracking if this is a driver
    if (usn) {
      LocationService.startTracking(usn);
    }

    return () => {
      WebSocketService.close();
      if (usn) {
        LocationService.stopTracking();
      }
    };
  }, [usn]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.webMessage}>
          Map view is not available on web. Please use the mobile app for full functionality.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 12.9716,
          longitude: 77.5946,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {Object.entries(busLocations).map(([busUsn, location]) => (
          <Marker
            key={busUsn}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={`Bus ${busUsn}`}
            description={`Speed: ${location.speed} km/h`}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  webMessage: {
    flex: 1,
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
});

export default BusMap; 