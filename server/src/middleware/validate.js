import { ApiError } from "../utils/apiError.js";

export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.shape?.body || schema.shape?.query || schema.shape?.params) {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
    } else {
      req.body = schema.parse(req.body);
    }

    next();
  } catch (error) {
    if (error.errors) {
      const details = error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
        code: e.code,
      }));
      return next(ApiError.badRequest("Validation failed", details));
    }
    next(error);
  }
};
