import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";

const CACHE_PREFIX = "divyam:v1:";

export const cacheMiddleware = (ttlSeconds = 60, tag = "global") => async (req, res, next) => {
  if (req.method !== "GET" || req.user) {
    // Never cache mutations or authenticated requests
    return next();
  }

  const redis = getRedisClient();
  const normalizedQuery = Object.keys(req.query || {})
    .sort()
    .map((k) => `${k}=${req.query[k]}`)
    .join("&");
  const cacheKey = `${CACHE_PREFIX}${tag}:${req.path}:${normalizedQuery}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    logger.debug({ err: err.message }, "Redis cache read failed, passing through");
  }

  // Intercept res.json
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.json = originalJson;

    if (res.statusCode === 200 && body?.success) {
      try {
        redis.setex(cacheKey, ttlSeconds, JSON.stringify(body)).catch(() => {});
        // Also add key to tag set for invalidation
        redis.sadd(`${CACHE_PREFIX}tag:${tag}`, cacheKey).catch(() => {});
      } catch (err) {
        logger.debug({ err: err.message }, "Redis cache write failed");
      }
    }

    res.setHeader("X-Cache", "MISS");
    return originalJson(body);
  };

  next();
};

export const invalidateCache = async (tag) => {
  const redis = getRedisClient();
  try {
    const tagKey = `${CACHE_PREFIX}tag:${tag}`;
    const keys = await redis.smembers(tagKey);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
      await redis.del(tagKey);
      logger.info({ tag, count: keys.length }, "Invalidated cache tag");
    }
  } catch (err) {
    logger.warn({ err: err.message, tag }, "Failed to invalidate cache tag");
  }
};

