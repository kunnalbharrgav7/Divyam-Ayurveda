import crypto from "crypto";
import { logger } from "../config/logger.js";

export const requestId = (req, res, next) => {
  const id = req.header("X-Request-Id") || crypto.randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);

  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        requestId: id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      },
      "HTTP Request completed"
    );
  });

  next();
};

