import { Redis } from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redisUrl);

// Log connection problems once per change, not on every retry
let lastError = '';
redis.on('error', (err) => {
  if (err.message !== lastError) {
    lastError = err.message;
    console.error('Redis error:', err.message.replace(/\/\/[^@]*@/, '//***@'));
  }
});
redis.on('ready', () => {
  lastError = '';
  console.log('✔ Redis connected');
});
