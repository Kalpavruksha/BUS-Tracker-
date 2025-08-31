const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Load environment variables
dotenv.config();

// Log environment variables for debugging (don't log the actual API key in production)
console.log('Environment variables loaded. API key present:', !!process.env.GOOGLE_MAPS_API_KEY);

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors());

// Serve static files from the client directory
const clientDir = path.join(__dirname, '..', 'client');
console.log('Client directory path:', clientDir);
app.use(express.static(clientDir));

// WebSocket server
const wss = new WebSocket.Server({ 
    server,
    clientTracking: true
});

// Store connected clients
const clients = new Map();

// In-memory user storage
const users = new Map();

// Add driver credentials
users.set('Markandeya', {
    id: 'Markandeya',
    usn: 'Markandeya',
    name: 'Driver Markandeya',
    role: 'driver'
});

// Add a test student
users.set('2KE22CS001', {
    id: '2KE22CS001',
    usn: '2KE22CS001',
    name: 'Student Test',
    role: 'student'
});

// Middleware
app.use(express.json());

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    try {
        const { usn, password, userType } = req.body;
        console.log('Login attempt:', { usn, password, userType });

        // For drivers
        if (userType === 'driver') {
            if (usn === 'Markandeya' && password === 'Markandeya') {
                return res.json({
                    user: users.get('Markandeya')
                });
            }
            return res.status(401).json({ message: 'Invalid driver credentials' });
        }

        // For students
        if (userType === 'student') {
            if (usn === '2KE22CS001' && password === '2KE22CS001') {
                return res.json({
                    user: users.get('2KE22CS001')
                });
            }
            return res.status(401).json({ message: 'Invalid student credentials' });
        }

        res.status(400).json({ message: 'Invalid user type' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    console.log('Client IP:', req.socket.remoteAddress);
    
    // Store a reference to the original IP address
    ws.remoteAddress = req.socket.remoteAddress;
    
    // Handle client messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received WebSocket message:', data);
            
            switch (data.type) {
                case 'register':
                    // Store client information
                    const clientInfo = {
                        userType: data.userType,
                        userId: data.userId,
                        usn: data.usn,
                        timestamp: Date.now()
                    };
                    
                    // Update client information if already registered
                    if (clients.has(ws)) {
                        console.log(`Client re-registering: ${data.userType} - ${data.usn}`);
                        const oldInfo = clients.get(ws);
                        clients.set(ws, { ...oldInfo, ...clientInfo });
                    } else {
                        clients.set(ws, clientInfo);
                        console.log(`Client registered: ${data.userType} - ${data.usn}`);
                    }
                    
                    // Send confirmation back to client
                    ws.send(JSON.stringify({
                        type: 'registration_confirmed',
                        status: 'success',
                        userType: data.userType,
                        usn: data.usn
                    }));
                    
                    // If this is a driver, announce to all students
                    if (data.userType === 'driver') {
                        broadcastToStudents({
                            type: 'driver_connected',
                            busId: data.usn,
                            driverName: data.usn
                        });
                    }
                    break;
                    
                case 'location_update':
                    // Process location update
                    const clientData = clients.get(ws);
                    console.log('Client data for location update:', clientData);
                    
                    if (clientData) {
                        if (clientData.userType === 'driver') {
                            console.log(`Received location update from driver ${clientData.usn}`);
                            
                            // Add timestamp if not provided
                            if (!data.timestamp) {
                                data.timestamp = Date.now();
                            }
                            
                            // Store the location data in the client record
                            clientData.lastLocation = data.location;
                            clientData.lastSpeed = data.speed || 0;
                            clientData.lastUpdateTime = data.timestamp;
                            clients.set(ws, clientData);
                            
                            // Broadcast to all students
                            broadcastToStudents({
                                type: 'location_update',
                                busId: clientData.usn,
                                location: data.location,
                                speed: data.speed || 0,
                                timestamp: data.timestamp
                            });
                        } else {
                            console.log(`Location update received from non-driver client (${clientData.userType})`);
                            // Send error response
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Only drivers can share location'
                            }));
                        }
                    } else {
                        console.log('Location update received from unregistered client');
                        // Ask client to register first
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Please login before sharing location'
                        }));
                    }
                    break;
                    
                case 'request_predictions':
                    // Handle prediction requests
                    console.log('Prediction request received');
                    
                    // Find all active drivers (drivers that have sent location updates)
                    const activeDrivers = [];
                    clients.forEach((client, clientWs) => {
                        if (client.userType === 'driver' && client.lastLocation) {
                            activeDrivers.push({
                                busId: client.usn,
                                location: client.lastLocation,
                                speed: client.lastSpeed || 0,
                                timestamp: client.lastUpdateTime || Date.now()
                            });
                        }
                    });
                    
                    console.log(`Found ${activeDrivers.length} active drivers`);
                    
                    // If there are active drivers, send their information
                    if (activeDrivers.length > 0) {
                        // Calculate predictions and send them back
                        const predictions = activeDrivers.map(driver => {
                            // College destination location (static)
                            const busLocation = driver.location;
                            const collegeLocation = { latitude: 15.3525, longitude: 75.0820 };
                            
                            // Calculate distance (simple Haversine formula)
                            const distance = calculateDistance(
                                busLocation.latitude, 
                                busLocation.longitude, 
                                collegeLocation.latitude, 
                                collegeLocation.longitude
                            );
                            
                            // Calculate ETA (in milliseconds)
                            const avgSpeed = driver.speed > 5 ? driver.speed : 30; // km/h (use actual speed if moving, otherwise use 30 km/h)
                            const timeInSeconds = distance / (avgSpeed / 3.6); // convert km/h to m/s
                            const eta = new Date(Date.now() + (timeInSeconds * 1000));
                            
                            // Format distance
                            const distanceText = distance < 1 
                                ? `${(distance * 1000).toFixed(0)} m` 
                                : `${distance.toFixed(1)} km`;
                                
                            // Format duration
                            const durationMinutes = Math.round(timeInSeconds / 60);
                            const durationText = durationMinutes < 60 
                                ? `${durationMinutes} minutes` 
                                : `${Math.floor(durationMinutes / 60)} hours ${durationMinutes % 60} minutes`;
                            
                            return {
                                type: 'prediction',
                                busId: driver.busId,
                                currentSpeed: driver.speed,
                                adjustedSpeed: avgSpeed,
                                distance: distance * 1000, // convert to meters
                                distanceText: distanceText,
                                estimatedArrival: eta.getTime(),
                                duration: durationText,
                                timestamp: Date.now()
                            };
                        });
                        
                        // Send all predictions as a single message
                        ws.send(JSON.stringify({
                            type: 'predictions',
                            predictions: predictions
                        }));
                    } else {
                        // No active drivers
                        ws.send(JSON.stringify({
                            type: 'predictions',
                            predictions: []
                        }));
                    }
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Unknown message type'
                    }));
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing message'
            }));
        }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            console.log(`Client disconnected: ${clientInfo.userType} - ${clientInfo.usn}`);
            
            // If a driver disconnects, notify all students
            if (clientInfo.userType === 'driver') {
                broadcastToStudents({
                    type: 'driver_disconnected',
                    busId: clientInfo.usn
                });
            }
        } else {
            console.log('Unknown client disconnected');
        }
        clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            console.log(`Error occurred for client: ${clientInfo.userType} - ${clientInfo.usn}`);
        }
        clients.delete(ws);
    });
});

// Helper function to broadcast messages to all students
function broadcastToStudents(message) {
    console.log('Broadcasting to students:', message);
    let sentCount = 0;
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            const clientInfo = clients.get(client);
            if (clientInfo && clientInfo.userType === 'student') {
                client.send(JSON.stringify(message));
                sentCount++;
            }
        }
    });
    
    console.log(`Broadcast complete. Sent to ${sentCount} students.`);
}

// Helper function to calculate distance between two coordinates (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
}

// Helper function to convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Helper function to calculate predictions
function calculatePredictions(data) {
    // This is a placeholder for actual prediction logic
    return [{
        busId: 'Bus1',
        currentSpeed: 40,
        adjustedSpeed: 35,
        distance: 5000,
        estimatedArrival: Date.now() + 15 * 60 * 1000 // 15 minutes from now
    }];
}

// Google Maps API key endpoint
app.get('/api/config/maps-key', (req, res) => {
    try {
        // Replace this with your actual Google Maps API key
        const apiKey = 'AIzaSyCowcO0L3X2KJ7WTOykihpVnW6qzKgXFMc'; 
        
        // Don't validate the key here - let Google's services handle that
        console.log('Serving Maps API key to client');
        res.json({ apiKey });
    } catch (error) {
        console.error('Error providing Google Maps API key:', error);
        res.status(500).json({ error: 'Failed to provide Google Maps API key' });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    const indexPath = path.join(clientDir, 'index.html');
    console.log('Attempting to serve index.html from:', indexPath);
    res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
}); 