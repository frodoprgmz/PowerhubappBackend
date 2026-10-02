const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const ttlockService = require('../services/ttlockService');
const User = require('../models/User');
const DoorLog = require('../models/DoorLog');

const router = express.Router();

// User or Admin can unlock
router.post('/unlock', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (req.user.role !== 'admin') {
    // Check if user has active pass
    if (!user.activePassExpiry || new Date(user.activePassExpiry) < new Date()) {
      return res.status(403).json({ message: 'Brak aktywnego karnetu. Kup karnet, aby otworzyć zamek.' });
    }
  }

  try {
    const result = await ttlockService.unlock(); // Auto-uses default lock
    if (result.errcode === 0) {
      // Log success
      await DoorLog.create({
        userEmail: user.email,
        role: user.role,
        status: 'Sukces',
        details: 'Zamek otwarty pomyślnie'
      });
      res.json({ message: 'Zamek został otwarty!' });
    } else {
      // Log failure
      await DoorLog.create({
        userEmail: user.email,
        role: user.role,
        status: 'Błąd',
        details: `TTLock Error: ${result.errmsg || result.errcode}`
      });
      res.status(400).json({ message: 'Nie udało się otworzyć zamka', error: result });
    }
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// Log Bluetooth unlock from the app (success or error)
router.post('/log', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { status = 'Sukces', details = 'Zamek otwarty przez Bluetooth (Aplikacja)', timestamp } = req.body;

    await DoorLog.create({
      userEmail: user.email,
      role: user.role,
      status,
      details,
      timestamp: timestamp ? new Date(timestamp) : Date.now()
    });
    res.json({ message: 'Zalogowano pomyślnie' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// Admin sends eKey
router.post('/sendEKey', authMiddleware, adminMiddleware, async (req, res) => {
  const { receiverUsername, startDate, endDate } = req.body;
  try {
    const result = await ttlockService.sendEKey(receiverUsername, startDate, endDate);
    if (result.errcode === 0) {
      res.json({ message: 'eKey wysłany pomyślnie!' });
    } else {
      res.status(400).json({ message: result.errmsg || 'Błąd wysyĹ‚ania eKey' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin generates offline passcode
router.post('/getPasscode', authMiddleware, adminMiddleware, async (req, res) => {
  const { startDate, endDate } = req.body;
  try {
    const result = await ttlockService.getOfflinePasscode(startDate, endDate);
    if (result.errcode === 0) {
      res.json({ message: `Wygenerowano kod: ${result.keyboardPwd}`, passcode: result.keyboardPwd });
    } else {
      res.status(400).json({ message: result.errmsg || 'Błąd generowania kodu' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin fetches lock status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const list = await ttlockService.getLockList();
    if (list && list.list && list.list.length > 0) {
      const lock = list.list[0];
      res.json({
        lockId: lock.lockId,
        lockAlias: lock.lockAlias,
        electricQuantity: lock.electricQuantity,
        lockData: lock.lockData,
        lockMac: lock.lockMac
      });
    } else {
      res.status(404).json({ message: 'Nie znaleziono zamków przypisanych do tego konta TTLock' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin fetches door logs from TTLock Cloud (real history of all lock events)
router.get('/logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const records = await ttlockService.getLockRecords();

    // Map TTLock record fields to the format the admin panel expects
    const formatted = records
      .sort((a, b) => b.lockDate - a.lockDate) // newest first
      .slice(0, 200) // limit to 200 most recent
      .map(r => ({
        _id: r.recordId,
        userEmail: r.hotelUsername || r.username || 'nieznany',
        role: 'client',
        timestamp: r.lockDate,
        status: r.success === 1 ? 'Sukces' : 'Błąd',
        details: r.keyName
          ? `${r.keyName} (${r.hotelUsername || r.username})`
          : (r.keyboardPwd ? `Kod: ${r.keyboardPwd}` : r.username || ''),
      }));

    res.json(formatted);
  } catch (error) {
    console.error('TTLock getLockRecords error:', error.message);
    // Fallback to MongoDB if TTLock API fails
    try {
      const logs = await DoorLog.find().sort({ timestamp: -1 }).limit(200).lean();
      res.json(logs);
    } catch (dbErr) {
      res.status(500).json({ message: error.message });
    }
  }
});

module.exports = router;

