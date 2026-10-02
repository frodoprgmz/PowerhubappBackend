const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  message: { message: 'Zbyt wiele prób z tego adresu IP. Spróbuj ponownie za 15 minut.' }
});

router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const user = new User({ 
      email, 
      password: hashedPassword, 
      role: role || 'client',
      verificationToken
    });
    await user.save();

    // Send verification email
    try {
      await sendEmail(
        email, 
        'Potwierdź swój email', 
        'Dziękujemy za rejestrację. Aby aktywować konto, przepisz poniższy kod do aplikacji:',
        'Witaj w Powerhub 24-7!',
        verificationToken
      );
    } catch (e) {
      console.error('Welcome email sending failed:', e);
    }

    res.status(201).json({ message: 'User created. Please verify your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first', verificationRequired: true });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/verify-email', async (req, res) => {
  const { email, token } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
    if (user.verificationToken !== token) return res.status(400).json({ message: 'Invalid verification code' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    user.verificationToken = verificationToken;
    await user.save();

    try {
      await sendEmail(
        email, 
        'Potwierdź swój email (Ponownie)', 
        'Oto Twój nowy kod weryfikacyjny. Przepisz poniższy kod do aplikacji:',
        'Weryfikacja Konta',
        verificationToken
      );
    } catch (e) {
      console.error('Resend email failed:', e);
    }

    res.json({ message: 'Verification email resent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = crypto.randomBytes(3).toString('hex').toUpperCase();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    try {
      await sendEmail(
        user.email,
        'Reset Hasła',
        'Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Skopiuj poniższy kod i wklej go w aplikacji:',
        'Resetowanie Hasła',
        token
      );
    } catch (e) {
      console.error('Reset email sending failed', e);
    }

    res.json({ message: 'Reset code sent to email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

