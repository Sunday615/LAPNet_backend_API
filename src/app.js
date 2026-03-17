const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { ipAllowlistMiddleware, hostAllowlistMiddleware, corsMiddleware } = require("./config/cors");
const { UPLOAD_DIR } = require("./config/paths");
const logger = require("./middleware/logger");
const { notFoundHandler, errorHandler } = require("./middleware/errors");
const pool = require("./db/pool");

function pickRouter(mod, name = "router") {
  const router = mod && mod.router ? mod.router : mod;

  if (typeof router !== "function") {
    const keys = mod && typeof mod === "object" ? Object.keys(mod) : [];
    throw new TypeError(
      `[app.js] ${name} is not an express router/function. typeof=${typeof router} keys=${keys.join(",")}`
    );
  }

  return router;
}

function parseTrustProxy(value, productionMode) {
  if (value === undefined || value === null || value === "") {
    return productionMode ? 1 : false;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  const asNumber = Number(normalized);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }

  return value;
}

const optimizeRoutes = pickRouter(require("./routes/optimize"), "optimizeRoutes");
const membersRoutes = pickRouter(require("./routes/members"), "membersRoutes");
const newsRoutes = pickRouter(require("./routes/news"), "newsRoutes");
const announcementRoutes = pickRouter(require("./routes/announcement"), "announcementRoutes");
const jobsRoutes = pickRouter(require("./routes/jobs"), "jobsRoutes");
const empLapnetRoutes = pickRouter(require("./routes/emp_lapnet"), "empLapnetRoutes");
const notificationRoutes = pickRouter(require("./routes/notifications"), "notificationRoutes");
const boarddirectorRoutes = pickRouter(require("./routes/boarddirector"), "boarddirectorRoutes");
const visitorsRoutes = pickRouter(require("./routes/visitor/visitors"), "visitorsRoutes");
const formTemplateRoutes = pickRouter(require("./routes/formtemplete"), "formTemplateRoutes");
const userloginRoutes = pickRouter(require("./routes/login/users"), "userloginRoutes");
const authRoutes = pickRouter(require("./routes/login/auth"), "authRoutes");
const formSubmissionsRoute = pickRouter(
  require("./routes/submission_form/formSubmissions"),
  "formSubmissionsRoute"
);
const announcements = pickRouter(
  require("./routes/membersbank/announcements"),
  "announcements(memberbank)"
);
const documentsRoute = pickRouter(
  require("./routes/uploaddocument/uploaddocument"),
  "documentsRoute"
);
const chatRoute = pickRouter(require("./routes/chat/chat"), "chatRoute");

const app = express();
const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY, isProd);

if (trustProxy !== false) {
  app.set("trust proxy", trustProxy);
}

app.disable("x-powered-by");

app.use(corsMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: isProd
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
        }
      : false,
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  })
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "5mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || "5mb" }));

app.use(ipAllowlistMiddleware);
app.use(hostAllowlistMiddleware);
app.use(logger);

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (_req, res) => {
    res.status(429).json({
      ok: false,
      message: "Too many authentication attempts. Please try again later.",
    });
  },
});

const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS" || req.path.startsWith("/auth"),
  handler: (_req, res) => {
    res.status(429).json({
      ok: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    dotfiles: "deny",
    etag: true,
    index: false,
    maxAge: "7d",
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Cache-Control", "public, max-age=604800");
    },
  })
);

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use("/api/optimize", optimizeRoutes);

app.use("/api/members", membersRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/announcement", announcementRoutes);

app.use("/api/jobs-list", jobsRoutes);
app.use("/api/jobs", jobsRoutes);

app.use("/api/boarddirector", boarddirectorRoutes);
app.use("/api/emp_lapnet", empLapnetRoutes);

app.use("/api/visitors", visitorsRoutes);
app.use("/api/visitor", visitorsRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/form-templates", formTemplateRoutes);

app.use("/api/users", userloginRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/form-submissions", formSubmissionsRoute);

app.use("/api/announcements", announcements);

app.use("/api/documents", documentsRoute);

app.use("/api/chat", chatRoute);

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    status: "OK",
    uptimeSec: Math.round(process.uptime()),
    ts: new Date().toISOString(),
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      ok: true,
      db: true,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health/db] DB error:", {
      code: err && err.code,
      message: err && err.message,
      name: err && err.name,
    });

    return res.status(503).json({
      ok: false,
      db: false,
      message: "DB ERROR",
      ...(isProd
        ? {}
        : {
            code: err && err.code,
            error: err && err.message,
            name: err && err.name,
          }),
      ts: new Date().toISOString(),
    });
  }
});

app.get("/", (_req, res) => {
  const basePayload = {
    ok: true,
    message: "API running",
    env: isProd ? "production" : "development",
  };

  if (isProd) {
    return res.json(basePayload);
  }

  return res.json({
    ...basePayload,
    routes: [
      "/health",
      "/health/db",
      "/api/chat/ping",
      "/api/chat/conversations/ensure",
      "/api/chat/conversations/:id/messages (GET, POST)",
      "/api/chat/admin/banks",
      "/api/members",
      "/api/news",
      "/api/announcement",
      "/api/announcements",
      "/api/jobs",
      "/api/jobs-list",
      "/api/boarddirector",
      "/api/emp_lapnet",
      "/api/notifications",
      "/api/form-templates",
      "/api/form-submissions",
      "/api/users",
      "/api/auth/login",
    ],
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;