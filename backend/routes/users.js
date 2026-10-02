const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/updatePass', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, expiryDate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (expiryDate === null) {
      user.activePassStart = null;
      user.activePassExpiry = null;
    } else {
      user.activePassStart = startDate ? new Date(startDate) : new Date();
      user.activePassExpiry = new Date(expiryDate);
    }
    
    await user.save();
    res.json({ message: 'Karnet zaktualizowany', activePassStart: user.activePassStart, activePassExpiry: user.activePassExpiry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
