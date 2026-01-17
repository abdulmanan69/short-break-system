const sequelize = require('../config/database');
const User = require('./User');
const BreakLog = require('./BreakLog');
const SystemSetting = require('./SystemSetting');
const Callback = require('./Callback');

// Force the association immediately
User.hasMany(BreakLog, { foreignKey: 'userId', as: 'logs' });
BreakLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Callback, { foreignKey: 'agentId', as: 'callbacks' });
Callback.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

module.exports = {
  sequelize,
  User,
  BreakLog,
  SystemSetting,
  Callback
};