const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Callback = sequelize.define('Callback', {
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  closerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  callbackTime: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Callback;