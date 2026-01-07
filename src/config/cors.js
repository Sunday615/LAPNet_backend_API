// src/config/cors.js
const cors = require("cors");

const CORS_ORIGIN = (process.env.CORS_ORIGIN || "*").trim();
const corsOptions =
  CORS_ORIGIN === "*"
    ? { origin: true }
    : {
        origin: (origin, cb) => {
          if (!origin) return cb(null, true);
          const allowed = CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
          return allowed.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"));
        },
      };

module.exports = {
  corsOptions,
  corsMiddleware: cors(corsOptions),
};
