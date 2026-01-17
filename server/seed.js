const { sequelize, User } = require('./models');
const bcrypt = require('bcrypt');

async function seed() {
  await sequelize.sync({ alter: true });
  
  const existingAdmin = await User.findOne({ where: { username: 'admin' } });
  if (existingAdmin) {
    existingAdmin.role = 'superadmin';
    await existingAdmin.save();
    console.log('Main admin promoted to Super Admin.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await User.create({
    username: 'admin',
    password: hashedPassword,
    role: 'superadmin',
    dailyQuotaMinutes: 1000
  });

  console.log('Super Admin created: admin / admin123');
  process.exit(0);
}

seed();