import { Redis } from 'ioredis';
import { config } from './config.js';

// enableReadyCheck: false because hosted Redis (Upstash) blocks the INFO command it uses
export const redis = new Redis(config.redisUrl, { enableReadyCheck: false });

// Log connection problems once per change, not on every retry
let lastError = '';
redis.on('error', (err) => {
  if (err.message !== lastError) {
    lastError = err.message;
    console.error('Redis error:', err.message.replace(/\/\/[^@]*@/, '//***@'));
  }
});
redis.on('connect', () => {
  lastError = '';
  console.log('✔ Redis connected');
});
