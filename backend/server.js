require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const { createServer } = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const ingestionRoutes = require('./routes/ingestion');
const connectDB = require('./config/db'); // This will be replaced by direct mongoose.connect
const rateLimit = require('express-rate-limit');
const { initScheduler } = require('./utils/scheduler'); // Added for scheduler initialization

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Pass IO instance to request object so routes can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting setup
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 API requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Routes
app.use('/api/', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/students', require('./routes/students'));

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Clients will join a room named after their teacherId to get scoped events
  socket.on('joinRoom', (teacherId) => {
    socket.join(teacherId);
    console.log(`[Socket.io] ${socket.id} joined room: ${teacherId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

// Connect to DB and Start Server
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log(`Connected to MongoDB: ${mongoose.connection.host}`);

  // Initialize Daily Class Auto-Scheduler
  initScheduler();

  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});
