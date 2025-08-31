const express = require('express');
const router = express.Router();
const Route = require('../models/Route');

// Get all routes
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true });
    res.json(routes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get route by ID
router.get('/:routeId', async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    res.json(route);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new route (admin only)
router.post('/', async (req, res) => {
  try {
    const { name, description, stops } = req.body;

    const route = new Route({
      name,
      description,
      stops
    });

    await route.save();
    res.status(201).json(route);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update route (admin only)
router.put('/:routeId', async (req, res) => {
  try {
    const { name, description, stops } = req.body;

    const route = await Route.findByIdAndUpdate(
      req.params.routeId,
      { name, description, stops },
      { new: true }
    );

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 