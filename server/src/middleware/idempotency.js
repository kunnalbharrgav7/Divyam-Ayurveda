import { IdempotencyKey } from "../models/IdempotencyKey.js";
import { sha256 } from "../utils/crypto.js";
import { ApiError } from "../utils/apiError.js";

export const requireIdempotency = (isStrict = false) => async (req, res, next) => {
  const key = req.header("Idempotency-Key");

  if (!key) {
    if (isStrict) {
      return next(
        ApiError.badRequest("Idempotency-Key header is required for this mutation endpoint.")
      );
    }
    return next();
  }

  const actorId = req.user ? req.user.id || req.user._id?.toString() : "anonymous";
  const bodyHash = sha256(req.body || {});
  const path = req.originalUrl || req.url;

  try {
    const existing = await IdempotencyKey.findOne({ key });

    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        return next(
          ApiError.conflict(
            "Idempotency key reused with different request payload or parameters."
          )
        );
      }

      if (existing.status === "processing") {
        return next(
          ApiError.conflict(
            "A request with this Idempotency-Key is currently processing. Please retry in a moment."
          )
        );
      }

      if (existing.status === "completed") {
        return res.status(existing.statusCode).json(existing.responseBody);
      }
    }

    // Create pending idempotency record (24 hour TTL)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const record = await IdempotencyKey.create({
      key,
      path,
      actorId,
      bodyHash,
      status: "processing",
      expiresAt,
    });

    // Intercept res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      // Restore original
      res.json = originalJson;

      // Update record in DB before socket response completes
      try {
        await IdempotencyKey.findByIdAndUpdate(record._id, {
          status: res.statusCode >= 400 ? "failed" : "completed",
          statusCode: res.statusCode,
          responseBody: body,
        });
      } catch (e) {
        // ignore idempotency save error
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    if (err.code === 11000) {
      return next(
        ApiError.conflict(
          "Concurrent mutation with this Idempotency-Key detected. Please retry in a moment."
        )
      );
    }
    next(err);
  }
};
