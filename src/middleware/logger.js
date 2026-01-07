// src/middleware/logger.js
module.exports = function logger(req, res, next) {
  console.log("REQ:", req.method, req.originalUrl);
  next();
};
