// src/middleware/errors.js
const multer = require("multer");

const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

function notFoundHandler(req, res) {
  const payload = {
    ok: false,
    message: "Route not found",
  };

  if (!isProd) {
    payload.method = req.method;
    payload.path = req.originalUrl;
  }

  res.status(404).json(payload);
}

function getMulterMessage(err) {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return "Uploaded file is too large";
    case "LIMIT_FILE_COUNT":
      return "Too many files uploaded";
    case "LIMIT_UNEXPECTED_FILE":
      return "Unexpected upload field";
    case "LIMIT_PART_COUNT":
      return "Too many parts in multipart request";
    case "LIMIT_FIELD_KEY":
      return "Upload field name is too long";
    case "LIMIT_FIELD_VALUE":
      return "Upload field value is too long";
    case "LIMIT_FIELD_COUNT":
      return "Too many non-file fields";
    default:
      return "Upload error";
  }
}

function normalizeStatusCode(err) {
  const statusCode = Number(err?.statusCode || err?.status);

  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
    return statusCode;
  }

  if (err instanceof multer.MulterError) {
    return 400;
  }

  if (err?.type === "entity.too.large") {
    return 413;
  }

  if (err instanceof SyntaxError && "body" in (err || {})) {
    return 400;
  }

  return 500;
}

function normalizeMessage(err, statusCode) {
  if (err instanceof multer.MulterError) {
    return getMulterMessage(err);
  }

  if (err?.type === "entity.too.large") {
    return "Request payload is too large";
  }

  if (err instanceof SyntaxError && "body" in (err || {})) {
    return "Invalid JSON payload";
  }

  if (!isProd && err?.message) {
    return err.message;
  }

  if (statusCode >= 500) {
    return "Internal server error";
  }

  return err?.message || "Request failed";
}

function errorHandler(err, req, res, next) {
  if (!err) return next();

  const statusCode = normalizeStatusCode(err);
  const message = normalizeMessage(err, statusCode);

  console.error("[errorHandler]", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    name: err?.name,
    code: err?.code,
    type: err?.type,
    message: err?.message,
    stack: err?.stack,
  });

  const payload = {
    ok: false,
    message,
  };

  if (!isProd) {
    payload.error = {
      name: err?.name || "Error",
      code: err?.code || null,
      type: err?.type || null,
    };
  }

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};