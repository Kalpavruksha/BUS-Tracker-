let map;
let markers = new Map();
let currentUser = null;
let locationWatchId = null;
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let wsConnectionTimer = null;

// Add this helper function at the beginning of the file
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // Add toast container styles
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
            }
            .toast {
                padding: 12px 20px;
                margin-bottom: 10px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                animation: slideIn 0.3s ease, fadeOut 0.5s ease 2.5s forwards;
                max-width: 300px;
            }
            .toast.info {
                background-color: #4285F4;
            }
            .toast.success {
                background-color: #34A853;
            }
            .toast.error {
                background-color: #EA4335;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Remove toast after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize map
window.initMap = function() {
    try {
        console.log('Initializing map...');
        const defaultCenter = { lat: 15.3525, lng: 75.0820 };
        
        // If we're using the fallback map, show it directly
        if (window.usingMapFallback) {
            console.log('Using fallback map display per global flag');
            showFallbackMap();
            // Initialize WebSocket after showing fallback
            initWebSocket();
            return;
        }
        
        // Check if Google Maps API is properly loaded
        if (!window.google || !window.google.maps) {
            console.warn('Google Maps API not properly loaded. Using fallback.');
            // Show a custom fallback map
            showFallbackMap();
            // Continue execution without actual map rendering
            initWebSocket();
            return;
        }
        
        // If we got here, we can use the actual Google Maps
        console.log('Creating Google Maps instance');
        try {
            map = new google.maps.Map(document.getElementById('map'), {
                center: defaultCenter,
                zoom: 13,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true
            });
            
            console.log('Map initialized successfully');
            
            // Create the directions service and renderer
            window.directionsService = new google.maps.DirectionsService();
            window.directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#4285F4',
                    strokeWeight: 4
                }
            });
            
            // Add a marker for the college (destination)
            const collegeMarker = new google.maps.Marker({
                position: defaultCenter,
                map: map,
                title: 'College Campus',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#EA4335',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                }
            });
            markers.set('college', collegeMarker);
            
            // Add info window for college
            const infoWindow = new google.maps.InfoWindow({
                content: '<div><strong>College Campus</strong><br>Destination</div>'
            });
            
            collegeMarker.addListener('click', () => {
                infoWindow.open(map, collegeMarker);
            });
            
        } catch (mapError) {
            console.error('Error creating Google Maps instance:', mapError);
            showFallbackMap();
        }
        
        // Initialize WebSocket after map is ready
        initWebSocket();
    } catch (error) {
        console.error('Error initializing map:', error);
        // Show fallback map
        showFallbackMap();
        // Continue with WebSocket initialization even if map fails
        initWebSocket();
    }
};

// Show a fallback map when Google Maps fails to load
function showFallbackMap() {
    console.log('Showing fallback map');
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f8f9fa; border-radius: 12px; overflow: hidden;">
                <div style="font-size: 24px; margin-bottom: 15px; color: #4285F4; font-weight: bold;">EaseRoute Tracking Active</div>
                <div style="font-size: 16px; text-align: center; padding: 0 20px; margin-bottom: 20px; color: #5F6368;">
                    Visual map display is unavailable, but location tracking is working.
                </div>
                <div style="width: 80%; height: 60%; background-color: #e8f0fe; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div id="fallback-bus-location" style="margin-bottom: 15px; font-weight: bold; color: #2c3e50;">Waiting for bus location updates...</div>
                    <div id="fallback-timestamp" style="font-size: 14px; color: #5F6368;">No updates yet</div>
                </div>
            </div>
        `;
    }
}

// Update the fallback map with bus location information
function updateFallbackMapDisplay(data) {
    const locationDiv = document.getElementById('fallback-bus-location');
    const timestampDiv = document.getElementById('fallback-timestamp');
    
    if (locationDiv && data && data.location) {
        locationDiv.innerHTML = `Bus ${data.busId || 'Unknown'}: Lat ${data.location.latitude.toFixed(6)}, Lng ${data.location.longitude.toFixed(6)}`;
        
        if (timestampDiv) {
            const now = new Date();
            timestampDiv.innerHTML = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }
}

// Initialize WebSocket connection
function initWebSocket() {
    try {
        // Clear any existing connection timer
        if (wsConnectionTimer) {
            clearTimeout(wsConnectionTimer);
            wsConnectionTimer = null;
        }
        
        // First, check if WebSocket is supported
        if (!window.WebSocket) {
            console.error('WebSockets not supported in this browser');
            alert('Your browser does not support WebSockets. Please use a modern browser like Chrome, Firefox, or Edge.');
            
            // Update connection status
            const statusElement = document.getElementById('connection-status');
            if (statusElement) {
                statusElement.textContent = 'WebSockets not supported';
                statusElement.className = 'connection-status error';
            }
            return;
        }
        
        // If a connection is already being established or is open, don't create another one
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            console.log('WebSocket connection already exists, not creating a new one');
            
            // If we have a user logged in and the connection is open, make sure we're registered
            if (currentUser && ws.readyState === WebSocket.OPEN) {
                console.log('Ensuring user is registered with existing connection');
                const registerMessage = {
                    type: 'register',
                    userType: currentUser.role,
                    userId: currentUser.id,
                    usn: currentUser.usn
                };
                try {
                    ws.send(JSON.stringify(registerMessage));
                } catch (error) {
                    console.error('Error sending registration to existing connection:', error);
                    // Force reconnect on error
                    ws.close();
                    setTimeout(initWebSocket, 1000);
                }
            }
            
            return;
        }
        
        console.log('Initializing WebSocket connection...');
        
        // Update connection status
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = 'Connecting...';
            statusElement.className = 'connection-status';
        }
        
        // Use explicit WebSocket URL with hostname and port
        // This is more reliable across browsers than using window.location.host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname || 'localhost'; 
        // Use port 3000 as the default for WebSocket connection to match server configuration
        const port = window.location.port || (protocol === 'wss:' ? '443' : '3000');
        const wsUrl = `${protocol}//${hostname}:${port}`;
        
        console.log('Connecting to WebSocket server at:', wsUrl);
        
        // Close existing connection if any
        if (ws) {
            try {
                ws.close();
            } catch (e) {
                console.log('Error closing existing WebSocket connection:', e);
            }
        }
        
        // Create new WebSocket connection
        ws = new WebSocket(wsUrl);

        // Set a connection timeout
        wsConnectionTimer = setTimeout(() => {
            console.error('WebSocket connection timeout');
            if (ws && ws.readyState === WebSocket.CONNECTING) {
                ws.close();
                
                // Update connection status
                if (statusElement) {
                    statusElement.textContent = 'Connection timeout';
                    statusElement.className = 'connection-status error';
                }
                
                // Try to reconnect
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    setTimeout(initWebSocket, 3000);
                } else {
                    alert('Could not connect to the server. Please check your internet connection and refresh the page.');
                }
            }
        }, 10000); // 10 second timeout

        // Store user registration info to send once connection is established
        const pendingRegistration = currentUser ? {
            type: 'register',
            userType: currentUser.role,
            userId: currentUser.id,
            usn: currentUser.usn
        } : null;

        ws.onopen = () => {
            console.log('WebSocket connection established');
            
            // Clear the connection timeout
            if (wsConnectionTimer) {
                clearTimeout(wsConnectionTimer);
                wsConnectionTimer = null;
            }
            
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            
            // Update connection status
            if (statusElement) {
                statusElement.textContent = 'Connected';
                statusElement.className = 'connection-status connected';
            }
            
            // Send registration message if we have user info
            if (pendingRegistration) {
                console.log('Registering user with server:', pendingRegistration);
                try {
                    ws.send(JSON.stringify(pendingRegistration));
                } catch (error) {
                    console.error('Error sending registration:', error);
                    // Try again after a short delay
                    setTimeout(() => {
                        try {
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify(pendingRegistration));
                            } else {
                                console.error('WebSocket not open when retrying registration');
                                // Force reconnect
                                initWebSocket();
                            }
                        } catch (retryError) {
                            console.error('Error sending registration (retry):', retryError);
                        }
                    }, 1000);
                }
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);
                
                switch (data.type) {
                    case 'registration_confirmed':
                        console.log('Registration confirmed by server');
                        break;
                        
                    case 'location_update':
                        updateBusLocation(data);
                        break;
                        
                    case 'predictions':
                        console.log('Received predictions data');
                        // Process prediction data
                        if (data.predictions && Array.isArray(data.predictions)) {
                            const processedPredictions = data.predictions.map(prediction => {
                                // Convert timestamp to Date object if it's not already
                                if (prediction.estimatedArrival && typeof prediction.estimatedArrival === 'number') {
                                    prediction.estimatedArrival = new Date(prediction.estimatedArrival);
                                }
                                return prediction;
                            });
                            
                            // Update the predictions display
                            updatePredictions(processedPredictions);
                        } else {
                            console.warn('Received empty or invalid predictions data');
                            updatePredictions([]);
                        }
                        break;
                        
                    case 'prediction':
                        // Handle individual prediction data for backward compatibility
                        console.log('Received individual prediction data');
                        const prediction = { ...data };
                        
                        // Convert timestamp to Date object if it's not already
                        if (prediction.estimatedArrival && typeof prediction.estimatedArrival === 'number') {
                            prediction.estimatedArrival = new Date(prediction.estimatedArrival);
                        }
                        
                        // Update the predictions display with this single prediction
                        updatePredictions([prediction]);
                        break;
                        
                    case 'driver_connected':
                        console.log(`Driver ${data.busId} connected`);
                        // Refresh predictions when a driver connects
                        if (document.getElementById('refresh-btn')) {
                            setTimeout(() => {
                                document.getElementById('refresh-btn').click();
                            }, 1000);
                        }
                        break;
                        
                    case 'driver_disconnected':
                        console.log(`Driver ${data.busId} disconnected`);
                        break;
                        
                    case 'error':
                        console.error('Server error:', data.message);
                        break;
                        
                    default:
                        console.log('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Show error to user
            if (statusElement) {
                statusElement.textContent = 'Connection error';
                statusElement.className = 'connection-status error';
            }
        };

        ws.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            
            // Update connection status
            if (statusElement) {
                statusElement.textContent = 'Disconnected';
                statusElement.className = 'connection-status error';
            }
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                setTimeout(initWebSocket, 5000);
            } else {
                console.error('Max reconnection attempts reached');
                if (statusElement) {
                    statusElement.textContent = 'Connection lost. Please refresh the page.';
                    statusElement.className = 'connection-status error';
                }
            }
        };
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = 'Error connecting to server';
            statusElement.className = 'connection-status error';
        }
    }
}

// Update bus location on map
function updateBusLocation(data) {
    try {
        console.log('Updating bus location:', data);
        if (!data.busId || !data.location) return;

        // Update the fallback map display if Google Maps isn't available
        if (window.usingMapFallback || !window.google || !window.google.maps || !map) {
            updateFallbackMapDisplay(data);
            return;
        }

        const busPosition = { 
            lat: data.location.latitude, 
            lng: data.location.longitude 
        };
        
        // College destination location (static)
        const collegePosition = { lat: 15.3525, lng: 75.0820 };
        
        // Create or update bus marker
        let marker = markers.get(data.busId);
        if (!marker) {
            console.log('Creating new marker for bus:', data.busId);
            
            // Create the bus marker
            marker = new google.maps.Marker({
                position: busPosition,
                map: map,
                title: `Bus ${data.busId}`,
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 5,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                    rotation: 0 // Will be updated if heading is available
                }
            });
            markers.set(data.busId, marker);
            
            // Add info window for bus
            const busInfoWindow = new google.maps.InfoWindow({
                content: `<div><strong>Bus ${data.busId}</strong><br>Current Speed: ${data.speed || 0} km/h</div>`
            });
            
            marker.addListener('click', () => {
                busInfoWindow.open(map, marker);
            });
            
        } else {
            // Update existing marker position
            marker.setPosition(busPosition);
        }
        
        // Request route directions only if directions service exists
        if (window.directionsService && window.directionsRenderer) {
            console.log('Requesting directions from', busPosition, 'to', collegePosition);
            
            window.directionsService.route(
                {
                    origin: busPosition,
                    destination: collegePosition,
                    travelMode: google.maps.TravelMode.DRIVING
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        console.log('Directions received successfully');
                        
                        // Center the map to fit the route
                        const bounds = new google.maps.LatLngBounds();
                        bounds.extend(busPosition);
                        bounds.extend(collegePosition);
                        map.fitBounds(bounds);
                        
                        // Display the route
                        window.directionsRenderer.setMap(map);
                        window.directionsRenderer.setDirections(result);
                        
                        // Get route information
                        const route = result.routes[0];
                        if (route && route.legs.length > 0) {
                            const leg = route.legs[0];
                            console.log('Route details:', {
                                distance: leg.distance.text,
                                duration: leg.duration.text
                            });
                            
                            // Calculate ETA based on route distance and speed
                            const distance = leg.distance.value; // in meters
                            const avgSpeed = data.speed > 5 ? data.speed : 30; // km/h (use actual speed if moving, otherwise use 30 km/h)
                            const timeInSeconds = distance / (avgSpeed / 3.6); // convert km/h to m/s
                            const eta = new Date(Date.now() + (timeInSeconds * 1000));
                            
                            // Update predictions
                            updatePredictions([{
                                busId: data.busId,
                                currentSpeed: data.speed || 0,
                                adjustedSpeed: avgSpeed,
                                distance: distance,
                                distanceText: leg.distance.text,
                                estimatedArrival: eta,
                                duration: leg.duration.text
                            }]);
                        }
                    } else {
                        console.error('Error getting directions:', status);
                    }
                }
            );
        } else {
            console.warn('Directions service not available');
        }
    } catch (error) {
        console.error('Error updating bus location:', error);
    }
}

// Update predictions display
function updatePredictions(predictions) {
    try {
        const predictionsList = document.getElementById('predictions-list');
        if (!predictionsList) return;

        // Clear existing predictions
        predictionsList.innerHTML = '';

        // Add new predictions
        predictions.forEach(prediction => {
            const predictionCard = document.createElement('div');
            predictionCard.className = 'prediction-card';
            predictionCard.id = `prediction-${prediction.busId}`;
            
            // Format distance
            let distanceText = prediction.distanceText || 'Unknown';
            if (!prediction.distanceText && prediction.distance) {
                distanceText = prediction.distance < 1000 
                    ? `${prediction.distance.toFixed(0)} m` 
                    : `${(prediction.distance / 1000).toFixed(1)} km`;
            }
            
            // Format arrival time
            let arrivalTime = 'Unknown';
            if (prediction.estimatedArrival instanceof Date) {
                arrivalTime = prediction.estimatedArrival.toLocaleTimeString();
            } else if (typeof prediction.estimatedArrival === 'number') {
                arrivalTime = new Date(prediction.estimatedArrival).toLocaleTimeString();
            }
            
            // Format current speed and adjusted speed
            const currentSpeed = typeof prediction.currentSpeed === 'number' ? prediction.currentSpeed.toFixed(1) : '0.0';
            const adjustedSpeed = typeof prediction.adjustedSpeed === 'number' ? prediction.adjustedSpeed.toFixed(1) : '30.0';
            
            // Calculate how soon the bus will arrive
            let etaClass = '';
            let etaMessage = '';
            
            if (prediction.estimatedArrival instanceof Date) {
                const now = new Date();
                const etaMinutes = Math.round((prediction.estimatedArrival - now) / 60000);
                
                if (etaMinutes <= 5) {
                    etaClass = 'eta-soon';
                    etaMessage = '<span class="eta-badge">Arriving Soon!</span>';
                } else if (etaMinutes <= 15) {
                    etaClass = 'eta-approaching';
                    etaMessage = '<span class="eta-badge">Approaching</span>';
                }
            }
            
            predictionCard.innerHTML = `
                <h3>
                    <span>Bus ${prediction.busId}</span>
                    ${etaMessage}
                </h3>
                <div class="prediction-details">
                    <div class="prediction-row">
                        <span class="prediction-label">Current Speed:</span>
                        <span class="prediction-value">${currentSpeed} km/h</span>
                    </div>
                    <div class="prediction-row">
                        <span class="prediction-label">Avg. Speed:</span>
                        <span class="prediction-value">${adjustedSpeed} km/h</span>
                    </div>
                    <div class="prediction-row">
                        <span class="prediction-label">Distance to Campus:</span>
                        <span class="prediction-value">${distanceText}</span>
                    </div>
                    <div class="prediction-row">
                        <span class="prediction-label">Travel Time:</span>
                        <span class="prediction-value">${prediction.duration || 'Calculating...'}</span>
                    </div>
                    <div class="prediction-row eta ${etaClass}">
                        <span class="prediction-label">Estimated Arrival:</span>
                        <span class="prediction-value">${arrivalTime}</span>
                    </div>
                </div>
            `;

            predictionsList.appendChild(predictionCard);
            
            // Also update page title with ETA for better visibility
            if (prediction.duration) {
                document.title = `EaseRoute - Bus ${prediction.busId} - ${prediction.duration} away`;
            }
        });
        
        // Add a "no predictions" message if no predictions were found
        if (predictions.length === 0) {
            predictionsList.innerHTML = `
                <div class="no-predictions">
                    <p>No active buses found</p>
                    <p>Click "Refresh Predictions" to check again</p>
                </div>
            `;
            
            // Reset the title
            document.title = "EaseRoute - Smart Bus Tracking";
        }
        
        // Add styling for the ETA badges
        if (!document.getElementById('eta-badge-styles')) {
            const style = document.createElement('style');
            style.id = 'eta-badge-styles';
            style.textContent = `
                .eta-badge {
                    display: inline-block;
                    font-size: 12px;
                    font-weight: normal;
                    padding: 3px 8px;
                    border-radius: 12px;
                    margin-left: 10px;
                    background-color: #fce8e6;
                    color: #EA4335;
                }
                
                .eta-soon .prediction-label,
                .eta-soon .prediction-value {
                    color: #EA4335 !important;
                    font-weight: 700 !important;
                }
                
                .eta-approaching .prediction-label,
                .eta-approaching .prediction-value {
                    color: #F4B400 !important;
                    font-weight: 600 !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Re-enable the refresh button if it was disabled
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn && refreshBtn.disabled) {
            refreshBtn.textContent = 'Refresh Predictions';
            refreshBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error updating predictions:', error);
    }
}

// Check WebSocket connection before enabling location sharing
function startLocationSharing() {
    try {
        // Check if WebSocket is supported
        if (!window.WebSocket) {
            alert('Your browser does not support WebSockets. Please use a modern browser like Chrome, Firefox, or Edge.');
            return;
        }
        
        // Check if WebSocket connection is established
        if (!ws) {
            console.log('WebSocket not initialized, attempting to initialize');
            initWebSocket();
            
            // Wait for connection to establish
            setTimeout(() => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    alert('Could not establish WebSocket connection. Please refresh the page and try again.');
                    return;
                } else {
                    // Connection established, proceed with location sharing
                    continueLocationSharing();
                }
            }, 2000);
            return;
        }
        
        // Check WebSocket state
        if (ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not in OPEN state:', ws.readyState);
            
            if (ws.readyState === WebSocket.CONNECTING) {
                alert('Still connecting to the server. Please wait a moment and try again.');
                return;
            } else {
                console.log('WebSocket connection lost, attempting to reconnect');
                initWebSocket();
                
                // Wait for reconnection
                setTimeout(() => {
                    if (!ws || ws.readyState !== WebSocket.OPEN) {
                        alert('Could not reconnect to the server. Please refresh the page and try again.');
                        return;
                    } else {
                        // Connection re-established, proceed with location sharing
                        continueLocationSharing();
                    }
                }, 2000);
                return;
            }
        }
        
        // If we get here, connection is good
        continueLocationSharing();
    } catch (error) {
        console.error('Error starting location sharing:', error);
        alert('Error starting location sharing: ' + error.message);
    }
}

// Continue with location sharing after ensuring WebSocket connection
function continueLocationSharing() {
    try {
        // Make sure we're registered as a driver
        if (currentUser && currentUser.role === 'driver') {
            console.log('Ensuring driver registration before sharing location');
            const registerMessage = {
                type: 'register',
                userType: 'driver',
                userId: currentUser.id,
                usn: currentUser.usn
            };
            ws.send(JSON.stringify(registerMessage));
        } else {
            console.warn('Not a driver account, cannot share location');
            alert('Only driver accounts can share location.');
            return;
        }

        if (navigator.geolocation) {
            console.log('Starting location sharing...');
            
            // First check if we have permission
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
                    console.log('Geolocation permission status:', permissionStatus.state);
                    
                    if (permissionStatus.state === 'denied') {
                        alert('Location access is denied. Please enable location access in your browser settings.');
                        return;
                    }
                    
                    startWatchingPosition();
                }).catch(error => {
                    console.log('Error checking geolocation permission, proceeding anyway:', error);
                    // Proceed anyway, the geolocation API will handle permission requests
                    startWatchingPosition();
                });
            } else {
                // Older browsers don't support permissions API, try directly
                startWatchingPosition();
            }
        } else {
            console.error('Geolocation is not supported by this browser.');
            alert('Geolocation is not supported by your browser.');
        }
    } catch (error) {
        console.error('Error in continueLocationSharing:', error);
        alert('Error starting location sharing: ' + error.message);
    }
}

// Start watching position after permission checks
function startWatchingPosition() {
    try {
        locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                console.log('Location update:', position.coords);
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                if (ws && ws.readyState === WebSocket.OPEN) {
                    const message = {
                        type: 'location_update',
                        location: location,
                        speed: position.coords.speed || 0,
                        userId: currentUser?.id,
                        timestamp: Date.now()
                    };
                    console.log('Sending location update:', message);
                    try {
                        ws.send(JSON.stringify(message));
                        
                        // Update our own map with the location
                        if (window.usingMapFallback) {
                            // Update fallback display
                            updateFallbackMapDisplay({
                                busId: currentUser?.usn || 'Your Bus',
                                location: location,
                                speed: position.coords.speed || 0
                            });
                        }
                        
                        // Update the button text and color
                        const locationButton = document.getElementById('toggle-location');
                        if (locationButton) {
                            locationButton.textContent = 'Location Sharing Enabled';
                            locationButton.style.backgroundColor = '#27ae60';
                            locationButton.classList.add('active');
                        }
                    } catch (error) {
                        console.error('Error sending location update:', error);
                        
                        // Try to reconnect WebSocket if there was an error sending
                        if (ws.readyState !== WebSocket.OPEN) {
                            initWebSocket();
                        }
                    }
                } else {
                    console.error('WebSocket not connected, cannot send location update');
                    // Don't alert immediately, try to reconnect first
                    if (!ws || ws.readyState === WebSocket.CLOSED) {
                        initWebSocket();
                    }
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                let errorMessage = 'Error getting location: ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Location permission denied.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'Unknown error.';
                }
                alert(errorMessage);
                
                // Reset location sharing button
                const locationButton = document.getElementById('toggle-location');
                if (locationButton) {
                    locationButton.textContent = 'Enable Location Sharing';
                    locationButton.style.backgroundColor = '#27ae60';
                    locationButton.classList.remove('active');
                }
                locationWatchId = null;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
        console.log('Location sharing started with ID:', locationWatchId);
    } catch (error) {
        console.error('Error in startWatchingPosition:', error);
        alert('Error starting location tracking: ' + error.message);
    }
}

// Stop location sharing
function stopLocationSharing() {
    try {
        if (locationWatchId !== null) {
            console.log('Stopping location sharing with ID:', locationWatchId);
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        }
    } catch (error) {
        console.error('Error stopping location sharing:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Location toggle button
    document.getElementById('toggle-location')?.addEventListener('click', function() {
        try {
            if (locationWatchId === null) {
                startLocationSharing();
                this.textContent = 'Disable Location Sharing';
                this.style.backgroundColor = '#e74c3c';
            } else {
                stopLocationSharing();
                this.textContent = 'Enable Location Sharing';
                this.style.backgroundColor = '#27ae60';
            }
        } catch (error) {
            console.error('Error toggling location sharing:', error);
        }
    });

    // Refresh predictions button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        try {
            console.log('Refreshing predictions...');
            
            // Clear current predictions first
            updatePredictions([]);
            
            // Show loading state
            const predictionsList = document.getElementById('predictions-list');
            if (predictionsList) {
                predictionsList.innerHTML = '<div class="loading-predictions">Loading predictions...</div>';
            }
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('Sending request_predictions message');
                ws.send(JSON.stringify({
                    type: 'request_predictions'
                }));
                
                // Update button text to show loading
                const refreshBtn = document.getElementById('refresh-btn');
                if (refreshBtn) {
                    const originalText = refreshBtn.textContent;
                    refreshBtn.textContent = 'Loading...';
                    refreshBtn.disabled = true;
                    
                    // Reset button after 3 seconds
                    setTimeout(() => {
                        refreshBtn.textContent = originalText;
                        refreshBtn.disabled = false;
                    }, 3000);
                }
                
                // Show toast notification
                showToast('Refreshing bus predictions...', 'info');
            } else {
                console.error('WebSocket not connected');
                showToast('Connection lost. Please refresh the page.', 'error');
            }
        } catch (error) {
            console.error('Error refreshing predictions:', error);
        }
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        try {
            stopLocationSharing();
            currentUser = null;
            document.getElementById('dashboard-section').classList.add('hidden');
            document.getElementById('login-section').classList.remove('hidden');
            document.getElementById('login-form').reset();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    });
});

// Handle login form submission
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const userType = document.getElementById('user-type').value;
        const usn = document.getElementById('usn').value;
        const password = document.getElementById('password').value;
        
        // Show loading state on button
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Logging in...';
        submitButton.disabled = true;

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usn,
                password,
                userType
            })
        });

        const data = await response.json();
        
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        if (response.ok) {
            currentUser = data.user;
            
            // Show success notification
            showToast(`Welcome, ${currentUser.name || currentUser.usn}!`, 'success');
            
            // Hide login, show dashboard
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');
            
            // Update user info display
            const nameElements = document.querySelectorAll('#user-name');
            nameElements.forEach(el => {
                el.textContent = currentUser.name || currentUser.usn;
            });
            
            document.getElementById('user-usn').textContent = currentUser.usn;
            
            const roleElement = document.getElementById('user-role');
            roleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
            
            // Apply color based on role
            if (currentUser.role === 'driver') {
                roleElement.style.backgroundColor = '#e8f0fe';
                roleElement.style.color = '#4285F4';
            } else {
                roleElement.style.backgroundColor = '#fce8e6';
                roleElement.style.color = '#EA4335';
            }
            
            // Show location controls for drivers
            if (currentUser.role === 'driver') {
                document.getElementById('toggle-location').style.display = 'block';
            } else {
                document.getElementById('toggle-location').style.display = 'none';
            }
            
            console.log('Login successful, initializing services...');
            
            // Only initialize the map if it hasn't been initialized yet
            if (!map && typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                console.log('Initializing map after login...');
                window.initMap();
            } else if (!map) {
                console.log('Google Maps API not loaded, loading now...');
                loadGoogleMaps();
            } else {
                console.log('Map already initialized, no need to initialize again');
                // Just initialize the WebSocket
                initWebSocket();
            }
            
            // Refresh predictions for students
            if (currentUser.role === 'student' && document.getElementById('refresh-btn')) {
                setTimeout(() => {
                    document.getElementById('refresh-btn').click();
                }, 1000);
            }
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    }
}); 