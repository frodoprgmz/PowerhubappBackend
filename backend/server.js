const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const passesRoutes = require('./routes/passes');
const lockRoutes = require('./routes/lock');
const usersRoutes = require('./routes/users');

const app = express();

// Trust proxy is required if deploying to Render, Heroku, etc., 
// so the rate limiter gets the real client IP instead of the load balancer's IP.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cors());

// Global rate limiting for API endpoints (e.g. 100 requests per 15 minutes per IP)
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Zbyt wiele zapytań z tego IP, spróbuj ponownie za 15 minut.' }
});
app.use('/api/', apiLimiter);

// Add a placeholder to check status
app.get('/api/status', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/passes', passesRoutes);
app.use('/api/lock', lockRoutes);
app.use('/api/users', usersRoutes);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

