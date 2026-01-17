const express = require('express');
const jwt = require('jsonwebtoken');
const { Callback, User } = require('../models');
const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET || 'secret_key_change_me';

// Middleware-like helper for auth
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if(!token) return res.status(401).json({error: "No token"});
    
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch(e) {
        res.status(401).json({error: "Invalid token"});
    }
};

// Create a callback (Agent)
router.post('/', authenticate, async (req, res) => {
    try {
        const { phoneNumber, closerName, callbackTime } = req.body;
        
        if (!phoneNumber || !closerName) {
            return res.status(400).json({ error: 'Phone number and closer name are required.' });
        }

        const callback = await Callback.create({
            agentId: req.user.id,
            phoneNumber,
            closerName,
            callbackTime: callbackTime ? new Date(callbackTime) : null
        });

        res.json(callback);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get My Callbacks (Agent)
router.get('/my', authenticate, async (req, res) => {
    try {
        const callbacks = await Callback.findAll({
            where: { agentId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(callbacks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all callbacks (Admin)
router.get('/', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const callbacks = await Callback.findAll({
            include: [{
                model: User,
                as: 'agent',
                attributes: ['id', 'username', 'name']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json(callbacks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;