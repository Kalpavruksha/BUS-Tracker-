const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');



// Get all active buses
router.get('/', async (req, res) => {
  try {
    const buses = await Bus.find({ isActive: true })
      .populate('route', 'name stops');
    res.json(buses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update bus location
router.put('/:busId/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    const bus = await Bus.findByIdAndUpdate(
      req.params.busId,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        lastUpdated: Date.now()
      },
      { new: true }
    );

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.json(bus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get buses near a specific location
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000 } = req.query;

    const buses = await Bus.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      isActive: true
    }).populate('route', 'name stops');

    res.json(buses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 
