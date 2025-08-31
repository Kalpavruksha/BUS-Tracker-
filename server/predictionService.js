const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

class PredictionService {
  constructor() {
    this.model = null;
    this.historicalData = [];
    this.MAX_HISTORY = 1000;
    this.loadModel();
  }

  async loadModel() {
    try {
      // Load or create model
      const modelPath = path.join(__dirname, 'model.json');
      if (fs.existsSync(modelPath)) {
        this.model = await tf.loadLayersModel(`file://${modelPath}`);
      } else {
        this.createModel();
      }
    } catch (error) {
      console.error('Error loading model:', error);
      this.createModel();
    }
  }

  createModel() {
    // Create a simple LSTM model for time series prediction
    this.model = tf.sequential();
    this.model.add(tf.layers.lstm({
      units: 32,
      returnSequences: true,
      inputShape: [10, 4] // 10 time steps, 4 features (lat, lon, speed, time)
    }));
    this.model.add(tf.layers.lstm({ units: 16 }));
    this.model.add(tf.layers.dense({ units: 2 })); // Predict lat and lon
    this.model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });
  }

  addHistoricalData(data) {
    this.historicalData.push(data);
    if (this.historicalData.length > this.MAX_HISTORY) {
      this.historicalData.shift();
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI/180);
  }

  predictArrivalTime(busLocation, stopLocation, currentSpeed) {
    // Simple prediction based on current speed and distance
    const distance = this.calculateDistance(
      busLocation.latitude,
      busLocation.longitude,
      stopLocation.latitude,
      stopLocation.longitude
    );
    
    // Adjust speed for traffic conditions (simple heuristic)
    const adjustedSpeed = currentSpeed * this.getTrafficFactor();
    
    // Calculate time in minutes
    const timeInHours = distance / adjustedSpeed;
    const timeInMinutes = timeInHours * 60;
    
    return {
      estimatedTime: timeInMinutes,
      distance: distance,
      currentSpeed: currentSpeed,
      adjustedSpeed: adjustedSpeed
    };
  }

  getTrafficFactor() {
    // Simple traffic factor based on time of day
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 9) return 0.7; // Morning rush
    if (hour >= 16 && hour <= 19) return 0.6; // Evening rush
    return 0.9; // Normal traffic
  }

  async predictNextLocation(busId, currentLocation, currentSpeed) {
    if (this.historicalData.length < 10) {
      return null;
    }

    try {
      // Prepare input data
      const inputData = this.historicalData
        .slice(-10)
        .map(data => [
          data.latitude,
          data.longitude,
          data.speed,
          new Date(data.timestamp).getTime()
        ]);

      const inputTensor = tf.tensor3d([inputData]);
      const prediction = await this.model.predict(inputTensor).data();
      
      return {
        latitude: prediction[0],
        longitude: prediction[1],
        confidence: 0.8 // Placeholder confidence score
      };
    } catch (error) {
      console.error('Error making prediction:', error);
      return null;
    }
  }

  async saveModel() {
    try {
      await this.model.save(`file://${path.join(__dirname, 'model')}`);
    } catch (error) {
      console.error('Error saving model:', error);
    }
  }
}

module.exports = new PredictionService(); 