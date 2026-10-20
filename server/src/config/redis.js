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
    let mockActive = false;
    const activateMock = (reason) => {
      if (!mockActive) {
        mockActive = true;
        redisClient = new RedisMock();
        logger.info({ reason }, "Redis in-memory mock cache activated");
      }
    };

    const client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times >= 1) {
          activateMock("Connection retry stopped");
          return null; // Stop retrying
        }
        return 100;
      },
      lazyConnect: true,
    });

    let reportedFailure = false;

    client.on("connect", () => {
      logger.info({ url: config.REDIS_URL }, "Redis client connected successfully");
    });

    client.on("error", (err) => {
      if (!reportedFailure) {
        reportedFailure = true;
        logger.warn({ err: err.message }, "Local Redis unavailable. Utilizing in-memory mock cache.");
      }
      activateMock(err.message);
    });

    // Try connecting lazily
    client.connect().catch((err) => {
      activateMock(err.message);
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
