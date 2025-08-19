// server.js
const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const apiRoutes = require('./routes/api-routes');

// Initialize the app
const app = express();

// Middleware
app.use(cors({
    origin: function(origin, callback) {
      if (!origin || config.allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

// Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Server error occurred' });
});

// Start server
app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});