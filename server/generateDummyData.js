const { sequelize, User, BreakLog } = require('./models');
const bcrypt = require('bcrypt');

async function generate() {
  console.log('--- Resyncing Database ---');
  await sequelize.sync({ alter: true });

  const hashedPassword = await bcrypt.hash('pass123', 10);

  // 1. Create Dummy Employees
  const employeesData = [
    { username: 'john_doe', name: 'John Doe', gender: 'male', quota: 30 },
    { username: 'sarah_smith', name: 'Sarah Smith', gender: 'female', quota: 45 },
    { username: 'mike_ross', name: 'Mike Ross', gender: 'male', quota: 20 },
    { username: 'emma_wilson', name: 'Emma Wilson', gender: 'female', quota: 30 }
  ];

  // Delete old dummy logs to clean up
  await BreakLog.destroy({ where: {} });

  for (const data of employeesData) {
    let user = await User.findOne({ where: { username: data.username } });
    if (!user) {
      user = await User.create({
        ...data,
        password: hashedPassword,
        role: 'employee',
        isActive: true
      });
    }
    
    console.log(`Generating 30 days of logs for ${user.username}...`);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const breakCount = Math.floor(Math.random() * 2) + 1;
      for (let b = 0; b < breakCount; b++) {
        const start = new Date(date);
        start.setHours(10 + b, Math.floor(Math.random() * 50), 0);
        const duration = 15 + Math.floor(Math.random() * 20);
        
        await BreakLog.create({
          userId: user.id,
          startTime: start,
          endTime: new Date(start.getTime() + duration * 60000),
          durationMinutes: duration
        });
      }
    }
  }

  console.log('--- Success: Data Re-linked ---');
  process.exit(0);
}

generate();