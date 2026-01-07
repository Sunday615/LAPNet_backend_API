// src/middleware/errors.js
const multer = require("multer");

function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
}

function errorHandler(err, req, res, next) {
  if (!err) return next();
  const isMulter = err instanceof multer.MulterError;

  console.error("SERVER ERROR:", err);

  res.status(400).json({
    ok: false,
    message: isMulter ? `Upload error: ${err.code}` : err.message || "Unknown error",
  });
}

module.exports = { notFoundHandler, errorHandler };
