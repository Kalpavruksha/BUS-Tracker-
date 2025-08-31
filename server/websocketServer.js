const WebSocket = require('ws');
const http = require('http');
const predictionService = require('./predictionService');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Store bus locations and student data
const busLocations = {};
const studentLocations = {};
const busRoutes = {
  'bus1': {
    stops: [
      { latitude: 15.3525, longitude: 75.0820, name: 'College' },
      { latitude: 15.3625, longitude: 75.0920, name: 'Stop 1' },
      { latitude: 15.3725, longitude: 75.1020, name: 'Stop 2' },
    ],
    currentStopIndex: 0,
    direction: 'to_college' // or 'from_college'
  },
  'bus2': {
    stops: [
      { latitude: 15.3525, longitude: 75.0820, name: 'College' },
      { latitude: 15.3425, longitude: 75.0720, name: 'Stop 3' },
      { latitude: 15.3325, longitude: 75.0620, name: 'Stop 4' },
    ],
    currentStopIndex: 0,
    direction: 'to_college'
  },
  'bus3': {
    stops: [
      { latitude: 15.3525, longitude: 75.0820, name: 'College' },
      { latitude: 15.3825, longitude: 75.1120, name: 'Stop 5' },
      { latitude: 15.3925, longitude: 75.1220, name: 'Stop 6' },
    ],
    currentStopIndex: 0,
    direction: 'to_college'
  }
};

// College location
const COLLEGE_LOCATION = {
  latitude: 15.3525,
  longitude: 75.0820,
  name: 'College'
};

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.busConnections = new Map();
    this.studentConnections = new Map();
    this.busLocations = new Map();
    this.busRoutes = new Map();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          
          switch (data.type) {
            case 'bus_register':
              this.handleBusRegistration(ws, data);
              break;
            case 'student_register':
              this.handleStudentRegistration(ws, data);
              break;
            case 'location_update':
              await this.handleLocationUpdate(ws, data);
              break;
            case 'route_update':
              this.handleRouteUpdate(ws, data);
              break;
            case 'arrival_request':
              await this.handleArrivalRequest(ws, data);
              break;
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      ws.on('close', () => {
        this.handleConnectionClose(ws);
      });
    });
  }

  handleBusRegistration(ws, data) {
    const { busId } = data;
    this.busConnections.set(busId, ws);
    this.busLocations.set(busId, null);
    console.log(`Bus ${busId} connected`);
  }

  handleStudentRegistration(ws, data) {
    const { studentId } = data;
    this.studentConnections.set(studentId, ws);
    console.log(`Student ${studentId} connected`);
  }

  async handleLocationUpdate(ws, data) {
    const { busId, location, speed } = data;
    
    if (!this.busConnections.has(busId)) {
      console.error(`Unknown bus ${busId}`);
      return;
    }

    // Store location and speed
    this.busLocations.set(busId, { ...location, speed, timestamp: Date.now() });
    
    // Add to historical data for predictions
    predictionService.addHistoricalData({
      busId,
      ...location,
      speed,
      timestamp: Date.now()
    });

    // Broadcast to all students
    this.broadcastToStudents({
      type: 'location_update',
      busId,
      location,
      speed
    });
  }

  handleRouteUpdate(ws, data) {
    const { busId, route } = data;
    this.busRoutes.set(busId, route);
    console.log(`Route updated for bus ${busId}`);
  }

  async handleArrivalRequest(ws, data) {
    const { studentId, busId, stopLocation } = data;
    
    const busLocation = this.busLocations.get(busId);
    if (!busLocation) {
      ws.send(JSON.stringify({
        type: 'arrival_response',
        error: 'Bus location not available'
      }));
      return;
    }

    // Get simple prediction
    const simplePrediction = predictionService.predictArrivalTime(
      busLocation,
      stopLocation,
      busLocation.speed
    );

    // Get ML-based prediction
    const mlPrediction = await predictionService.predictNextLocation(
      busId,
      busLocation,
      busLocation.speed
    );

    ws.send(JSON.stringify({
      type: 'arrival_response',
      busId,
      currentLocation: busLocation,
      estimatedArrival: simplePrediction.estimatedTime,
      distance: simplePrediction.distance,
      currentSpeed: simplePrediction.currentSpeed,
      adjustedSpeed: simplePrediction.adjustedSpeed,
      nextLocationPrediction: mlPrediction
    }));
  }

  broadcastToStudents(message) {
    const messageString = JSON.stringify(message);
    this.studentConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
      }
    });
  }

  handleConnectionClose(ws) {
    // Remove bus connection
    for (const [busId, connection] of this.busConnections.entries()) {
      if (connection === ws) {
        this.busConnections.delete(busId);
        this.busLocations.delete(busId);
        console.log(`Bus ${busId} disconnected`);
        break;
      }
    }

    // Remove student connection
    for (const [studentId, connection] of this.studentConnections.entries()) {
      if (connection === ws) {
        this.studentConnections.delete(studentId);
        console.log(`Student ${studentId} disconnected`);
        break;
      }
    }
  }
}

module.exports = WebSocketServer;

// Simulate bus movement along routes
function simulateBusMovement() {
  Object.keys(busRoutes).forEach(busId => {
    const route = busRoutes[busId];
    const currentStop = route.stops[route.currentStopIndex];
    const nextStop = route.stops[(route.currentStopIndex + 1) % route.stops.length];
    
    // Calculate direction to next stop
    const latDiff = nextStop.latitude - currentStop.latitude;
    const lonDiff = nextStop.longitude - currentStop.longitude;
    
    // Update bus location
    const currentLocation = busLocations[busId] || {
      latitude: currentStop.latitude,
      longitude: currentStop.longitude,
      speed: 0
    };

    // Move bus towards next stop
    const speed = 0.0001; // Adjust for realistic speed
    busLocations[busId] = {
      latitude: currentLocation.latitude + (latDiff * speed),
      longitude: currentLocation.longitude + (lonDiff * speed),
      speed: 30 + Math.random() * 20,
      timestamp: Date.now(),
      direction: route.direction
    };

    // Check if bus reached next stop
    const distanceToStop = Math.sqrt(
      Math.pow(busLocations[busId].latitude - nextStop.latitude, 2) +
      Math.pow(busLocations[busId].longitude - nextStop.longitude, 2)
    );

    if (distanceToStop < 0.0001) {
      route.currentStopIndex = (route.currentStopIndex + 1) % route.stops.length;
      if (route.currentStopIndex === 0) {
        route.direction = route.direction === 'to_college' ? 'from_college' : 'to_college';
      }
    }

    // Broadcast update
    broadcast({
      type: 'location_update',
      busId: busId,
      location: busLocations[busId]
    });
  });
}

// Start simulation (update every 2 seconds for smoother movement)
setInterval(simulateBusMovement, 2000);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 