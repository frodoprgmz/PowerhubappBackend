const fs = require('fs');
let content = fs.readFileSync('routes/lock.js', 'utf8');

content = content.replace(
  /router\.post\('\\/log', authMiddleware, async \(req, res\) => \{\s*const user = await User\.findById\(req\.user\.userId\);\s*try \{\s*await DoorLog\.create\(\{\s*userEmail: user\.email,\s*role: user\.role,\s*status: 'Sukces',\s*details: 'Zamek otwarty przez Bluetooth \\(Aplikacja\\)'\s*\}\);\s*res\.json\(\{ message: 'Zalogowano pomyślnie' \}\);\s*\} catch \(error\) \{\s*res\.status\(500\)\.json\(\{ message: 'Błąd serwera', error: error\.message \}\);\s*\}\s*\}\);/,
  \// Log Bluetooth unlock from the app (success or error)
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
});\
);

fs.writeFileSync('routes/lock.js', content, 'utf8');
