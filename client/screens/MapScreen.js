import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapContainer, TileLayer, Marker as WebMarker, Polyline as WebPolyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import WebSocketService from '../services/websocketService';
import * as Location from 'expo-location';

const MapScreen = ({ route }) => {
  const [busLocations, setBusLocations] = useState({});
  const [studentLocations, setStudentLocations] = useState({});
  const [busRoutes, setBusRoutes] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [collegeLocation, setCollegeLocation] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [waitingAtStop, setWaitingAtStop] = useState(false);
  const mapRef = useRef(null);
  const { studentId, usn, name } = route.params || {};

  useEffect(() => {
    // Get user location
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // If student is logged in, send their location
      if (studentId) {
        WebSocketService.sendStudentLocation({
          studentId,
          usn,
          name,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          waitingAtStop: false
        });
      }
    })();

    // Connect to WebSocket server
    const ws = WebSocketService.connect('ws://localhost:5000');
    
    // Set up WebSocket callbacks
    WebSocketService.addCallback('location_update', (data) => {
      setBusLocations(prevLocations => ({
        ...prevLocations,
        [data.busId]: data.location
      }));
    });

    WebSocketService.addCallback('student_update', (data) => {
      setStudentLocations(prevLocations => ({
        ...prevLocations,
        [data.studentId]: data.location
      }));
    });

    WebSocketService.addCallback('initial_data', (data) => {
      setBusLocations(data.busLocations);
      setStudentLocations(data.studentLocations);
      setBusRoutes(data.busRoutes);
      setCollegeLocation(data.collegeLocation);
    });

    return () => {
      WebSocketService.removeCallback('location_update');
      WebSocketService.removeCallback('student_update');
      WebSocketService.removeCallback('initial_data');
      WebSocketService.close();
    };
  }, [studentId, usn, name]);

  // Handle stop selection
  const handleStopPress = (stop) => {
    setSelectedStop(stop);
    if (studentId) {
      Alert.alert(
        'Bus Stop Selected',
        `Do you want to wait at ${stop.name}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Yes',
            onPress: () => {
              setWaitingAtStop(true);
              WebSocketService.sendStudentLocation({
                studentId,
                usn,
                name,
                latitude: stop.latitude,
                longitude: stop.longitude,
                waitingAtStop: true
              });
            }
          }
        ]
      );
    }
  };

  // Custom bus marker component
  const BusMarker = ({ coordinate, title, description, direction }) => (
    <Marker coordinate={coordinate} title={title} description={description}>
      <View style={styles.busMarker}>
        <View style={[
          styles.busIcon,
          { transform: [{ rotate: direction === 'to_college' ? '0deg' : '180deg' }] }
        ]} />
      </View>
    </Marker>
  );

  // Custom stop marker component
  const StopMarker = ({ coordinate, title, onPress }) => (
    <Marker coordinate={coordinate} title={title} onPress={() => onPress({...coordinate, name: title})}>
      <View style={styles.stopMarker}>
        <View style={styles.stopMarkerInner} />
      </View>
    </Marker>
  );

  // Custom student marker component
  const StudentMarker = ({ coordinate, title }) => (
    <Marker coordinate={coordinate} title={title}>
      <View style={styles.studentMarker}>
        <View style={styles.studentMarkerInner} />
      </View>
    </Marker>
  );

  if (Platform.OS === 'web') {
    const center = routeStops[0] || { latitude: 12.9716, longitude: 77.5946 };

    return (
      <View style={styles.container}>
        <MapContainer
          center={[center.latitude, center.longitude]}
          zoom={13}
          style={styles.map}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Route stops */}
          {routeStops.map((stop, index) => (
            <WebMarker
              key={`stop-${index}`}
              position={[stop.latitude, stop.longitude]}
            />
          ))}

          {/* Route line */}
          {routeStops.length > 1 && (
            <WebPolyline
              positions={routeStops.map(stop => [stop.latitude, stop.longitude])}
              color="#007AFF"
              weight={3}
            />
          )}

          {/* Bus locations */}
          {Object.entries(busLocations).map(([busId, location]) => (
            <WebMarker
              key={`bus-${busId}`}
              position={[location.latitude, location.longitude]}
            />
          ))}
        </MapContainer>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: collegeLocation?.latitude || 15.3525,
          longitude: collegeLocation?.longitude || 75.0820,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {/* College location */}
        {collegeLocation && (
          <Marker
            coordinate={collegeLocation}
            title="College"
            pinColor="#FFD700"
          />
        )}

        {/* User location */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="#4CAF50"
          />
        )}

        {/* Bus routes and stops */}
        {Object.entries(busRoutes).map(([busId, route]) => (
          <React.Fragment key={busId}>
            {/* Route line */}
            <Polyline
              coordinates={route.stops.map(stop => ({
                latitude: stop.latitude,
                longitude: stop.longitude,
              }))}
              strokeColor="#007AFF"
              strokeWidth={3}
              lineDashPattern={[1]}
            />
            
            {/* Stops */}
            {route.stops.map((stop, index) => (
              <StopMarker
                key={`stop-${busId}-${index}`}
                coordinate={{
                  latitude: stop.latitude,
                  longitude: stop.longitude,
                }}
                title={stop.name}
                onPress={handleStopPress}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Bus locations */}
        {Object.entries(busLocations).map(([busId, location]) => (
          <BusMarker
            key={`bus-${busId}`}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={`Bus ${busId}`}
            description={`Speed: ${location.speed?.toFixed(1) || 0} km/h\nDirection: ${location.direction === 'to_college' ? 'To College' : 'From College'}`}
            direction={location.direction}
          />
        ))}

        {/* Student locations */}
        {Object.entries(studentLocations).map(([studentId, location]) => (
          <StudentMarker
            key={`student-${studentId}`}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={`${location.name} (${location.usn})`}
          />
        ))}
      </MapView>

      {/* Student info panel */}
      {studentId && (
        <View style={styles.infoPanel}>
          <Text style={styles.infoText}>Student: {name}</Text>
          <Text style={styles.infoText}>USN: {usn}</Text>
          {waitingAtStop && selectedStop && (
            <Text style={styles.waitingText}>Waiting at: {selectedStop.name}</Text>
          )}
        </View>
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
    width: '100%',
    height: '100%',
  },
  busMarker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#FF0000',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  stopMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  studentMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  infoPanel: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
  },
  waitingText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default MapScreen; 