const express = require('express');
const { Op } = require('sequelize');
const { User, BreakLog, SystemSetting, sequelize } = require('../models');
const router = express.Router();

module.exports = (io) => {
  
  // Get System Settings (Broadcast)
  router.get('/settings', async (req, res) => {
      try {
          const broadcast = await SystemSetting.findOne({ where: { key: 'broadcast_message' } });
          res.json({
              broadcast: broadcast ? broadcast.value : null
          });
      } catch(e) {
          res.status(500).json({ error: e.message });
      }
  });

  // Get current system status
  router.get('/status', async (req, res) => {
    try {
      const activeUser = await User.findOne({ where: { currentStatus: 'on_break' } });
      const activeLog = activeUser ? await BreakLog.findOne({ 
          where: { userId: activeUser.id, endTime: null },
          order: [['startTime', 'DESC']]
      }) : null;

      res.json({
        isLocked: !!activeUser,
        activeUser: activeUser ? { username: activeUser.username, id: activeUser.id } : null,
        startTime: activeLog ? activeLog.startTime : null,
        serverTime: new Date()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Start Break
  router.post('/start', async (req, res) => {
    const { userId } = req.body;
    
    // Transaction to ensure atomicity
    const t = await sequelize.transaction();

    try {
      // 1. Check Global Lock (Max Concurrent Breaks per Gender)
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) {
        await t.rollback();
        return res.status(404).json({ error: 'User not found' });
      }

      const genderKey = user.gender === 'female' ? 'max_female_breaks' : 'max_male_breaks';
      const setting = await SystemSetting.findOne({ where: { key: genderKey } });
      const maxBreaks = setting ? parseInt(setting.value) : 1;

      const activeCount = await User.count({ 
        where: { currentStatus: 'on_break', gender: user.gender },
        transaction: t
      });

      if (activeCount >= maxBreaks) {
        await t.rollback();
        const genderLabel = user.gender === 'female' ? 'Female' : 'Male';
        return res.status(409).json({ error: `System busy. Max ${maxBreaks} ${genderLabel} employee(s) allowed on break.` });
      }

      // 2. Check Quota (Used today)

      // Calc used quota for today
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      
      const logs = await BreakLog.findAll({
        where: {
          userId,
          startTime: { [Op.gte]: startOfDay }
        },
        transaction: t
      });

      const usedMinutes = logs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
      
      // Floating point safety: If used is 29.9999 and quota is 30, it allows.
      // But if used is 30.0001, it blocks.
      
      console.log(`User ${user.username}: Used ${usedMinutes}m / Quota ${user.dailyQuotaMinutes}m`);

      if (usedMinutes >= user.dailyQuotaMinutes) {
        await t.rollback();
        return res.status(403).json({ error: `Daily quota exceeded. You have used ${Math.round(usedMinutes)}/${user.dailyQuotaMinutes} minutes.` });
      }

      // 3. Start Break
      await BreakLog.create({
        userId,
        startTime: new Date()
      }, { transaction: t });

      user.currentStatus = 'on_break';
      await user.save({ transaction: t });

      await t.commit();

      // Emit event
      io.emit('status_change', {
        isLocked: true,
        activeUser: { username: user.username, id: user.id },
        startTime: new Date()
      });

      res.json({ success: true });

    } catch (err) {
      if(t) await t.rollback();
      res.status(500).json({ error: err.message });
    }
  });

  // Stop Break
  router.post('/stop', async (req, res) => {
    const { userId } = req.body;
    const t = await sequelize.transaction();

    try {
      const user = await User.findByPk(userId, { transaction: t });
      if (user.currentStatus !== 'on_break') {
        await t.rollback();
        return res.status(400).json({ error: 'User is not on break.' });
      }

      const log = await BreakLog.findOne({
        where: { userId, endTime: null },
        order: [['startTime', 'DESC']],
        transaction: t
      });

      if (log) {
        const now = new Date();
        const duration = (now - new Date(log.startTime)) / 1000 / 60; // minutes
        log.endTime = now;
        log.durationMinutes = duration;
        await log.save({ transaction: t });
      }

      user.currentStatus = 'available';
      await user.save({ transaction: t });

      await t.commit();

      io.emit('status_change', {
        isLocked: false,
        activeUser: null,
        startTime: null
      });

      res.json({ success: true });

    } catch (err) {
      await t.rollback();
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get My Today's Summary
  router.get('/summary/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        
        const logs = await BreakLog.findAll({
            where: { userId, startTime: { [Op.gte]: startOfDay } }
        });
        
        const totalUsed = logs.reduce((sum, l) => {
            const duration = l.endTime 
                ? (l.durationMinutes || 0) 
                : (new Date() - new Date(l.startTime)) / 1000 / 60;
            return sum + duration;
        }, 0);

        res.json({ totalUsed: Math.round(totalUsed * 10) / 10, logs });
      } catch(e) {
          res.status(500).json({error: e.message});
      }
  });

  return router;
};