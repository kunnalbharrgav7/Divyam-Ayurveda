import { ApiError } from "../utils/apiError.js";
import { sendError } from "../utils/response.js";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";

export const errorHandler = (err, req, res, next) => {
  // 1. Handled ApiError
  if (err instanceof ApiError) {
    return sendError(res, err, err.statusCode);
  }

  // Payload too large error (Express body-parser)
  if (err.type === "entity.too.large" || err.status === 413) {
    return sendError(
      res,
      {
        code: "PAYLOAD_TOO_LARGE",
        message: "The uploaded image or payload is too large. Please select a smaller photo or compress it.",
      },
      413
    );
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "value";
    return sendError(
      res,
      {
        code: "DUPLICATE_RESOURCE",
        message: `A record with this ${field} (${value}) already exists.`,
        details: { field, value },
      },
      409
    );
  }

  // 3. Mongoose Validation Error
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(
      res,
      {
        code: "VALIDATION_ERROR",
        message: "Database schema validation failed",
        details,
      },
      422
    );
  }

  // 4. Mongoose Cast Error (Invalid ObjectId)
  if (err.name === "CastError") {
    return sendError(
      res,
      {
        code: "INVALID_IDENTIFIER",
        message: `Invalid format for field ${err.path}`,
        details: { field: err.path, value: err.value },
      },
      400
    );
  }

  // 5. Unhandled / Internal Server Error
  logger.error(
    {
      err: err.message,
      stack: config.NODE_ENV !== "production" ? err.stack : undefined,
      requestId: req.id,
      url: req.originalUrl,
      method: req.method,
    },
    "Unhandled exception caught in global error handler"
  );

  return sendError(
    res,
    {
      code: "INTERNAL_SERVER_ERROR",
      message: config.NODE_ENV === "production" ? "An internal server error occurred" : err.message,
      details: null,
    },
    500
  );
};

