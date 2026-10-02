const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const email = 'pacerjerzy@gmail.com';
    const existing = await User.findOne({ email });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('Kaczor97', 10);
      await User.create({ email, password: hashedPassword, role: 'admin', isVerified: true });
      console.log('Admin user created');
    } else {
      console.log('Admin already exists');
    }
    mongoose.disconnect();
  });
