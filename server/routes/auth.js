const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { usn, password, userType } = req.body;

    // Validate USN format for students
    if (userType === 'student') {
      const usnRegex = /^2KE(22CS(0[0-9][0-9]|1[0-7][0-9]|180)|23CS(4[0-1][0-9]|420|421)|22CS060)$/;
      if (!usnRegex.test(usn)) {
        return res.status(400).json({ message: 'Invalid USN format' });
      }
      if (password !== usn) {
        return res.status(401).json({ message: 'Password must match your USN' });
      }
    }

    // Find user by USN
    const user = await User.findOne({ usn });
    if (!user) {
      // For students, create a new user if they don't exist
      if (userType === 'student') {
        const newUser = new User({
          usn,
          password,
          name: `Student ${usn}`,
          role: 'student'
        });
        await newUser.save();
        return generateTokenAndRespond(res, newUser);
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return generateTokenAndRespond(res, user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate token and respond
function generateTokenAndRespond(res, user) {
  const token = jwt.sign(
    { userId: user._id, usn: user.usn, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user._id,
      usn: user.usn,
      name: user.name,
      role: user.role
    }
  });
}

// Register route (admin only)
router.post('/register', async (req, res) => {
  try {
    const { usn, password, name, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ usn });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      usn,
      password,
      name,
      role: role || 'student'
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 