const express = require('express');
const { Op } = require('sequelize');
const { User, BreakLog, SystemSetting, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET || 'secret_key_change_me';

const getRequester = async (req) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if(!token) return null;
        const decoded = jwt.verify(token, SECRET_KEY);
        return await User.findByPk(decoded.id);
    } catch(e) { return null; }
};

module.exports = (io) => {

    router.get('/users', async (req, res) => {
      try {
        const requester = await getRequester(req);
        if(!requester) return res.status(401).json({error: "Unauthorized"});

        let whereClause = (requester.role === 'admin') ? { role: 'employee' } : { id: { [Op.ne]: requester.id } };

        const users = await User.findAll({
          where: whereClause,
          attributes: ['id', 'username', 'name', 'gender', 'role', 'dailyQuotaMinutes', 'currentStatus', 'isActive']
        });

        const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);

        const usersWithStats = await Promise.all(users.map(async (user) => {
          const logs = await BreakLog.findAll({ where: { userId: user.id, startTime: { [Op.gte]: startOfDay } } });
          const usedMinutes = logs.reduce((sum, log) => {
              const duration = log.endTime 
                ? (log.durationMinutes || 0) 
                : (new Date() - new Date(log.startTime)) / 1000 / 60;
              return sum + duration;
          }, 0);
          return { ...user.toJSON(), usedToday: Math.round(usedMinutes * 10) / 10 };
        }));

        res.json(usersWithStats);
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    router.post('/settings', async (req, res) => {
        try {
            const requester = await getRequester(req);
            if(!requester || requester.role !== 'superadmin') return res.status(403).json({error: "Denied"});
            
            const keys = ['max_male_breaks', 'max_female_breaks', 'default_quota', 'global_theme'];
            for (const key of keys) {
                if (req.body[key] !== undefined) {
                    let s = await SystemSetting.findOne({ where: { key } });
                    if(!s) await SystemSetting.create({ key, value: String(req.body[key]) });
                    else { s.value = String(req.body[key]); await s.save(); }
                }
            }
            io.emit('settings_update', req.body); 
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/settings', async (req, res) => {
        try {
            const settings = await SystemSetting.findAll();
            const config = {};
            settings.forEach(s => config[s.key] = s.value);
            res.json(config);
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/notify/:userId', async (req, res) => {
        try {
            const requester = await getRequester(req);
            if(!requester) return res.status(401).json({error: "Denied"});
            io.emit('personal_notification', { userId: req.params.userId, message: req.body.message });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/broadcast', async (req, res) => {
        try {
            const requester = await getRequester(req);
            if(!requester || requester.role !== 'superadmin') return res.status(403).json({error: "Denied"});
            const { message } = req.body;
            let setting = await SystemSetting.findOne({ where: { key: 'broadcast_message' } });
            if (!setting) await SystemSetting.create({ key: 'broadcast_message', value: message });
            else { setting.value = message; await setting.save(); }
            io.emit('broadcast_update', { message }); 
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });
    
    router.post('/broadcast/clear', async (req, res) => {
        try {
            const requester = await getRequester(req);
            if(!requester || requester.role !== 'superadmin') return res.status(403).json({error: "Denied"});
            await SystemSetting.destroy({ where: { key: 'broadcast_message' } });
            io.emit('broadcast_update', { message: null });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.delete('/user/:id', async (req, res) => {
        try {
            const requester = await getRequester(req);
            const user = await User.findByPk(req.params.id);
            if(!user || !requester) return res.status(404).json({ error: "Not found" });
            if(requester.role === 'admin' && user.role !== 'employee') return res.status(403).json({error: "Denied"});
            await BreakLog.destroy({ where: { userId: user.id } });
            await user.destroy();
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.put('/user/:id', async (req, res) => {
        try {
            const requester = await getRequester(req);
            const user = await User.findByPk(req.params.id);
            if(!user || !requester) return res.status(404).json({ error: "Not found" });
            if(requester.role === 'admin' && user.role !== 'employee') return res.status(403).json({error: "Denied"});
            const { name, username, gender, role, dailyQuotaMinutes, isActive } = req.body;
            if(name !== undefined) user.name = name;
            if(username !== undefined) user.username = username;
            if(gender !== undefined) user.gender = gender;
            if(role !== undefined && requester.role === 'superadmin') user.role = role;
            if(dailyQuotaMinutes !== undefined) user.dailyQuotaMinutes = dailyQuotaMinutes;
            if(isActive !== undefined) user.isActive = isActive;
            await user.save();
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/force-logout-session/:userId', async (req, res) => {
        try {
            const user = await User.findByPk(req.params.userId);
            if(user) { user.isLoggedIn = false; await user.save(); }
            io.emit('force_logout_user', { userId: req.params.userId });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/reset-password/:id', async (req, res) => {
        try {
            const user = await User.findByPk(req.params.id);
            user.password = await bcrypt.hash(req.body.newPassword, 10);
            await user.save();
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/force-stop/:userId', async (req, res) => {
        try {
            const user = await User.findByPk(req.params.userId);
            const log = await BreakLog.findOne({ where: { userId: user.id, endTime: null }, order: [['startTime', 'DESC']] });
            if (log) {
                const now = new Date();
                log.endTime = now;
                log.durationMinutes = (now - new Date(log.startTime)) / 1000 / 60;
                await log.save();
            }
            user.currentStatus = 'available'; await user.save();
            io.emit('status_change', { isLocked: false, activeUser: null });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/reset-usage/:userId', async (req, res) => {
        try {
            const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
            await BreakLog.destroy({ where: { userId: req.params.userId, startTime: { [Op.gte]: startOfDay } } });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });

    return router;
};