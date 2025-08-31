import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

class WebSocketService {
  static instance = null;
  static ws = null;
  static callbacks = {};

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  static connect(url) {
    if (!WebSocketService.ws) {
      WebSocketService.ws = new WebSocket(url);
      
      WebSocketService.ws.onopen = () => {
        console.log('WebSocket Connected');
        this.initCallbacks();
      };

      WebSocketService.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'location_update') {
            this.callbacks['location_update']?.(data);
          } else if (data.type === 'student_update') {
            this.callbacks['student_update']?.(data);
          } else if (data.type === 'initial_data') {
            this.callbacks['initial_data']?.(data);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      WebSocketService.ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      WebSocketService.ws.onclose = () => {
        console.log('WebSocket Disconnected');
        WebSocketService.ws = null;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(url), 5000);
      };
    }
    return WebSocketService.ws;
  }

  static initCallbacks() {
    Object.keys(this.callbacks).forEach(callbackType => {
      if (callbackType === 'initial_data' && WebSocketService.ws.readyState === WebSocket.OPEN) {
        // Request initial data
        WebSocketService.ws.send(JSON.stringify({
          type: 'get_initial_data'
        }));
      }
    });
  }

  static addCallback(type, callback) {
    this.callbacks[type] = callback;
    if (WebSocketService.ws?.readyState === WebSocket.OPEN) {
      this.initCallbacks();
    }
  }

  static removeCallback(type) {
    delete this.callbacks[type];
  }

  static close() {
    if (WebSocketService.ws) {
      WebSocketService.ws.close();
      WebSocketService.ws = null;
    }
  }

  static sendLocationUpdate(busId, location) {
    if (WebSocketService.ws?.readyState === WebSocket.OPEN) {
      WebSocketService.ws.send(JSON.stringify({
        type: 'location_update',
        busId,
        ...location
      }));
    }
  }

  static sendStudentLocation(studentData) {
    if (WebSocketService.ws?.readyState === WebSocket.OPEN) {
      WebSocketService.ws.send(JSON.stringify({
        type: 'student_location',
        ...studentData
      }));
    }
  }
}

export default WebSocketService; 