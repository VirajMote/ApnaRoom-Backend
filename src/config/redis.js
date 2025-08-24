import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      // End reconnecting on a specific error and flush all commands with a individual error
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout and flush all commands with a individual error
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

// Create Redis client
const redisClient = createClient(redisConfig);

// Connect to Redis
export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
    
    // Test Redis connection
    await redisClient.ping();
    console.log('✅ Redis ping successful');
    
  } catch (error) {
    console.error('❌ Redis connection error:', error.message);
    // Don't exit process for Redis connection failure
    // Application can still work without Redis
  }
};

// Redis event handlers
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('🔌 Redis client connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis client disconnected');
});

// Redis utility functions
export const setCache = async (key, value, expireTime = 3600) => {
  try {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    await redisClient.setEx(key, expireTime, serializedValue);
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
};

export const getCache = async (key) => {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

export const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return false;
  }
};

export const clearCache = async (pattern = '*') => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Redis clear error:', error);
    return false;
  }
};

export const setHash = async (key, field, value, expireTime = 3600) => {
  try {
    await redisClient.hSet(key, field, typeof value === 'object' ? JSON.stringify(value) : value);
    if (expireTime > 0) {
      await redisClient.expire(key, expireTime);
    }
    return true;
  } catch (error) {
    console.error('Redis hset error:', error);
    return false;
  }
};

export const getHash = async (key, field) => {
  try {
    const value = await redisClient.hGet(key, field);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error('Redis hget error:', error);
    return null;
  }
};

export const getAllHash = async (key) => {
  try {
    const hash = await redisClient.hGetAll(key);
    const result = {};
    
    for (const [field, value] of Object.entries(hash)) {
      try {
        result[field] = JSON.parse(value);
      } catch {
        result[field] = value;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Redis hgetall error:', error);
    return {};
  }
};

export const incrementCounter = async (key, increment = 1, expireTime = 3600) => {
  try {
    const result = await redisClient.incrBy(key, increment);
    if (expireTime > 0) {
      await redisClient.expire(key, expireTime);
    }
    return result;
  } catch (error) {
    console.error('Redis incr error:', error);
    return null;
  }
};

export const setExpiry = async (key, seconds) => {
  try {
    await redisClient.expire(key, seconds);
    return true;
  } catch (error) {
    console.error('Redis expire error:', error);
    return false;
  }
};

export const getTTL = async (key) => {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    console.error('Redis ttl error:', error);
    return -1;
  }
};

// Close Redis connection
export const closeRedis = async () => {
  try {
    await redisClient.quit();
    console.log('🔌 Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
};

// Export Redis client
export default redisClient;
