// Configuration for the application
const config = {
    // WebSocket server configuration
    wsServer: {
        host: window.location.hostname,
        port: 3000
    },
    
    // API endpoints
    api: {
        baseUrl: '/api',
        endpoints: {
            login: '/auth/login',
            logout: '/auth/logout'
        }
    },
    
    // Map configuration
    map: {
        defaultCenter: { lat: 15.3525, lng: 75.0820 },
        defaultZoom: 13,
        markers: {
            bus: {
                url: '/assets/bus-marker.png',
                size: { width: 32, height: 32 }
            },
            student: {
                url: '/assets/student-marker.png',
                size: { width: 32, height: 32 }
            },
            college: {
                url: '/assets/college-marker.png',
                size: { width: 32, height: 32 }
            }
        }
    }
};

// Function to fetch Google Maps API key from server
async function getGoogleMapsApiKey() {
    try {
        const response = await fetch('/api/config/maps-key');
        if (!response.ok) {
            throw new Error('Failed to fetch Google Maps API key');
        }
        const data = await response.json();
        return data.apiKey;
    } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
        return null;
    }
}

// Function to load Google Maps API
async function loadGoogleMaps() {
    try {
        const apiKey = await getGoogleMapsApiKey();
        if (!apiKey) {
            throw new Error('No Google Maps API key available');
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
            script.async = true;
            script.defer = true;
            script.onerror = () => reject(new Error('Failed to load Google Maps API'));
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    } catch (error) {
        console.error('Error loading Google Maps API:', error);
        throw error;
    }
}

// Make functions available globally
window.getGoogleMapsApiKey = getGoogleMapsApiKey;
window.loadGoogleMaps = loadGoogleMaps;
window.config = config; 