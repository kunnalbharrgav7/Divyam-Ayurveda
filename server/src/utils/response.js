export const sendSuccess = (res, data, meta = undefined, statusCode = 200) => {
  const response = {
    success: true,
    data,
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (res, error, statusCode = 400) => {
  const response = {
    success: false,
    error: {
      code: error.code || "BAD_REQUEST",
      message: error.message || "An error occurred",
      details: error.details || null,
      requestId: res.req?.id || undefined,
    },
  };

  return res.status(statusCode).json(response);
};

