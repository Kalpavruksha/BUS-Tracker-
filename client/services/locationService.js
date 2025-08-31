import * as Location from 'expo-location';
import WebSocketService from './websocketService';

class LocationService {
  constructor() {
    this.locationSubscription = null;
    this.isTracking = false;
  }

  async startTracking(usn) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Connect to WebSocket server
      const ws = WebSocketService.connect('ws://localhost:3000');
      
      ws.onmessage = (event) => {
        console.log('Received message:', event.data);
      };

      this.isTracking = true;

      // Start location updates
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          if (this.isTracking) {
            const locationData = {
              usn,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              speed: location.coords.speed,
              heading: location.coords.heading,
              timestamp: new Date().toISOString(),
            };
            WebSocketService.send(locationData);
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  stopTracking() {
    this.isTracking = false;
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    WebSocketService.close();
  }
}

export default new LocationService(); 