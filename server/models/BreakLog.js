const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BreakLog = sequelize.define('BreakLog', {
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  durationMinutes: {
    type: DataTypes.FLOAT, // Float to capture partial minutes if needed
    defaultValue: 0
  }
});

module.exports = BreakLog;