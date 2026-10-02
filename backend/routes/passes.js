const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Pass = require('../models/Pass');

const router = express.Router();

// Simulate payment and buy pass
router.post('/buy', authMiddleware, async (req, res) => {
  const { type } = req.body; // 'daily' or 'monthly'
  const userId = req.user.userId;

  let price = 0;
  let durationDays = 0;

  if (type === 'daily') {
    price = 20;
    durationDays = 1;
  } else if (type === 'monthly') {
    price = 100;
    durationDays = 30;
  } else {
    return res.status(400).json({ message: 'Invalid pass type' });
  }

  try {
    // Simulate payment processing...
    // In real app we would call Stripe, PayU, Przelewy24, etc.
    const paymentSuccess = true;

    if (!paymentSuccess) {
      return res.status(400).json({ message: 'Payment failed' });
    }

    // Determine expiry date
    const user = await User.findById(userId);
    let newExpiry = new Date();
    
    // If user already has an active pass, extend it
    if (user.activePassExpiry && new Date(user.activePassExpiry) > new Date()) {
      newExpiry = new Date(user.activePassExpiry);
    }
    
    newExpiry.setDate(newExpiry.getDate() + durationDays);

    const pass = new Pass({
      userId,
      type,
      price,
      expiresAt: newExpiry
    });

    await pass.save();

    user.activePassExpiry = newExpiry;
    await user.save();

    // Send confirmation email
    const { sendEmail } = require('../services/emailService');
    try {
      await sendEmail(
        user.email, 
        'Potwierdzenie Zakupu', 
        `Dziękujemy za zakup karnetu ${type === 'daily' ? '1-dniowego' : '30-dniowego'}.\nTwój karnet jest aktywny i ważny do:\n${newExpiry.toLocaleString('pl-PL')}`,
        'Twój Karnet jest aktywny!'
      );
    } catch (e) {
      console.error('Email sending failed', e);
    }

    res.json({ message: 'Pass purchased successfully', expiresAt: newExpiry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current pass info
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const now = new Date();
    const hasActivePass = user.activePassExpiry && 
                          new Date(user.activePassExpiry) > now &&
                          (!user.activePassStart || new Date(user.activePassStart) <= now);
    res.json({
      hasActivePass,
      activePassStart: user.activePassStart,
      activePassExpiry: user.activePassExpiry
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
