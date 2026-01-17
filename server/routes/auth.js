const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET || 'secret_key_change_me';

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.isActive === false) return res.status(403).json({ error: 'Account is deactivated. Contact Admin.' });

    // Ensure we have the latest status
    await user.reload();

    // Single Session Check (Strict)
    // Coerce to boolean to handle potential nulls from schema migration
    if (user.role === 'employee' && !!user.isLoggedIn) {
        return res.status(409).json({ error: 'User already logged in on another device. Please logout from the first device.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    // Set Logged In
    user.isLoggedIn = true;
    await user.save();

    const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, SECRET_KEY, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, dailyQuotaMinutes: user.dailyQuotaMinutes } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { userId } = req.body;
        if(userId) {
            const user = await User.findByPk(userId);
            if(user) {
                user.isLoggedIn = false;
                await user.save();
            }
        }
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Register (Admin Only)
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, gender, role, quota } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      name,
      gender: gender || 'male',
      password: hashedPassword,
      role: role || 'employee',
      dailyQuotaMinutes: quota || 30,
      isActive: true,
      isLoggedIn: false
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Change Password (Self)
router.post('/change-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if(!token) return res.status(401).json({error: "No token"});
        const decoded = jwt.verify(token, SECRET_KEY);
        
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(decoded.id);

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if(!isValid) return res.status(401).json({ error: "Current password incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Get Me
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if(!token) return res.status(401).json({error: "No token"});
    
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findByPk(decoded.id);
        if (user.isActive === false) return res.status(403).json({ error: 'Account deactivated' });
        res.json(user);
    } catch(e) {
        res.status(401).json({error: "Invalid token"});
    }
})

module.exports = router;