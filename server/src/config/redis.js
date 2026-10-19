import Redis from "ioredis";
import RedisMock from "ioredis-mock";
import { config } from "./index.js";
import { logger } from "./logger.js";

let redisClient = null;

export const initRedis = () => {
  if (redisClient) return redisClient;

  if (config.NODE_ENV === "test") {
    logger.info("Initializing in-memory mock Redis for testing");
    redisClient = new RedisMock();
    return redisClient;
  }

  try {
    const client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn("Redis connection attempts exhausted. Falling back to in-memory cache.");
          return null; // Stop retrying and fallback
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
    });

    client.on("connect", () => {
      logger.info({ url: config.REDIS_URL }, "Redis client connected successfully");
    });

    client.on("error", (err) => {
      logger.warn({ err: err.message }, "Redis connection failed. Utilizing in-memory mock fallback.");
    });

    // Try connecting lazily
    client.connect().catch(() => {
      logger.warn("Failed initial Redis connection. Active in-memory fallback enabled.");
    });

    redisClient = client;
  } catch (error) {
    logger.warn({ error: error.message }, "Redis instantiation failed, using in-memory mock");
    redisClient = new RedisMock();
  }

  return redisClient;
};

export const getRedisClient = () => {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
};

