const { User, BreakLog } = require('./models');

async function check() {
  const userCount = await User.count();
  const logCount = await BreakLog.count();
  const latestLog = await BreakLog.findOne({ order: [['startTime', 'DESC']] });
  
  console.log(`Users in DB: ${userCount}`);
  console.log(`Logs in DB: ${logCount}`);
  if (latestLog) {
      console.log(`Latest Log Date: ${latestLog.startTime}`);
  }
  process.exit(0);
}

check();