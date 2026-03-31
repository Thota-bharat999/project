const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io connection handler with JWT authentication
 */
const setupSocketHandlers = (io) => {
  // Middleware: authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} | User: ${socket.user?.email}`);

    // Join user-specific room for targeted messages
    socket.join(`user:${socket.user.id}`);

    // Join organisation room
    if (socket.user.organisation) {
      socket.join(`org:${socket.user.organisation}`);
    }

    // Subscribe to specific video progress
    socket.on('subscribe:video', (videoId) => {
      socket.join(`video:${videoId}`);
      console.log(`📺 User ${socket.user.email} subscribed to video ${videoId}`);
    });

    // Unsubscribe from video progress
    socket.on('unsubscribe:video', (videoId) => {
      socket.leave(`video:${videoId}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    // Send welcome event
    socket.emit('connected', {
      message: 'Real-time connection established',
      userId: socket.user.id,
    });
  });

  return io;
};

module.exports = { setupSocketHandlers };
