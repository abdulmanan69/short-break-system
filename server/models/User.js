const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true 
  },
  gender: {
    type: DataTypes.ENUM('male', 'female'),
    defaultValue: 'male',
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('superadmin', 'admin', 'employee'),
    defaultValue: 'employee'
  },
  dailyQuotaMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  currentStatus: {
    type: DataTypes.ENUM('available', 'on_break'),
    defaultValue: 'available'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isLoggedIn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = User;