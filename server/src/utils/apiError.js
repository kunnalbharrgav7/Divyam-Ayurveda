export class ApiError extends Error {
  constructor(statusCode, message, code = "BAD_REQUEST", details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Unauthorized access", details = null) {
    return new ApiError(401, message, "UNAUTHORIZED", details);
  }

  static forbidden(message = "Forbidden action", details = null) {
    return new ApiError(403, message, "FORBIDDEN", details);
  }

  static notFound(message = "Resource not found", details = null) {
    return new ApiError(404, message, "NOT_FOUND", details);
  }

  static conflict(message, details = null) {
    return new ApiError(409, message, "CONFLICT", details);
  }

  static unprocessable(message, details = null) {
    return new ApiError(422, message, "UNPROCESSABLE_ENTITY", details);
  }

  static internal(message = "Internal server error", details = null) {
    return new ApiError(500, message, "INTERNAL_SERVER_ERROR", details);
  }
}

