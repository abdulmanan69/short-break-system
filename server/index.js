const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const breakRoutes = require('./routes/break');
const adminRoutes = require('./routes/admin');
const callbackRoutes = require('./routes/callback');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// 1. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/break', breakRoutes(io));
app.use('/api/admin', adminRoutes(io));
app.use('/api/callback', callbackRoutes);

// 2. Static Files (Built Frontend)
app.use(express.static(path.join(__dirname, '../client/dist')));

// 3. Catch-all for Frontend (Safe Middleware version)
app.use((req, res, next) => {
  // If the request is for an API or has a file extension, skip it
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  // Otherwise, send the frontend app
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Socket Connection
const onlineUsers = new Map(); 

io.on('connection', (socket) => {
  socket.on('user_connected', (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit('online_users_update', Array.from(new Set(onlineUsers.values())));
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online_users_update', Array.from(new Set(onlineUsers.values())));
  });
});

const PORT = process.env.PORT || 3000;

sequelize.sync().then(() => {
  console.log('Database synced');
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});