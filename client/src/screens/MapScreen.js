import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Text, Card } from 'react-native-paper';
import io from 'socket.io-client';
import axios from 'axios';

const MapScreen = () => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);

  useEffect(() => {
    // Fetch initial bus and route data
    fetchData();

    // Connect to WebSocket for real-time updates
    const socket = io('http://localhost:5000');
    
    socket.on('bus-location', (data) => {
      setBuses(prevBuses => 
        prevBuses.map(bus => 
          bus._id === data._id ? { ...bus, ...data } : bus
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [busesResponse, routesResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/buses'),
        axios.get('http://localhost:5000/api/routes')
      ]);

      setBuses(busesResponse.data);
      setRoutes(routesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 12.9716, // Default to your college location
          longitude: 77.5946,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {routes.map(route => (
          <Polyline
            key={route._id}
            coordinates={route.stops.map(stop => ({
              latitude: stop.location.coordinates[1],
              longitude: stop.location.coordinates[0]
            }))}
            strokeColor="#0000FF"
            strokeWidth={3}
          />
        ))}

        {buses.map(bus => (
          <Marker
            key={bus._id}
            coordinate={{
              latitude: bus.currentLocation.coordinates[1],
              longitude: bus.currentLocation.coordinates[0]
            }}
            title={bus.busNumber}
            description={`Driver: ${bus.driverName}`}
            onPress={() => setSelectedBus(bus)}
          />
        ))}
      </MapView>

      {selectedBus && (
        <Card style={styles.busInfo}>
          <Card.Content>
            <Text variant="titleLarge">Bus {selectedBus.busNumber}</Text>
            <Text variant="bodyMedium">Driver: {selectedBus.driverName}</Text>
            <Text variant="bodyMedium">Contact: {selectedBus.driverContact}</Text>
            <Text variant="bodyMedium">
              Last Updated: {new Date(selectedBus.lastUpdated).toLocaleTimeString()}
            </Text>
          </Card.Content>
        </Card>
      )}
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
  busInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
  },
});

export default MapScreen; 