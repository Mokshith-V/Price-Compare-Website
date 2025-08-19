// src/config.js
require('dotenv').config();

const development = {
  port: process.env.PORT || 3000,
  nodeEnv: 'development',
  logLevel: 'debug',
  cacheTtl: 3600,
  allowedOrigins: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  apiBaseUrl: 'http://localhost:3000/api'
};

const production = {
  port: process.env.PORT || 8080,
  nodeEnv: 'production',
  logLevel: 'info',
  cacheTtl: 7200, // 2 hours cache in production
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://your-domain.com'],
  apiBaseUrl: 'https://api.your-domain.com/api'
};

// Determine which config to use
const config = process.env.NODE_ENV === 'production' ? production : development;

module.exports = config;