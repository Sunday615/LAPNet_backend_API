// src/app.js
const express = require("express");
const cors = require("cors");

const { corsMiddleware, corsOptions } = require("./config/cors");
const { UPLOAD_DIR } = require("./config/paths");
const logger = require("./middleware/logger");
const { notFoundHandler, errorHandler } = require("./middleware/errors");

const pool = require("./db/pool");

// ----------------------
// Small helper: accept either `module.exports = router` OR `module.exports = { router }`
// ----------------------
function pickRouter(mod, name = "router") {
  const r = (mod && mod.router) ? mod.router : mod;
  if (typeof r !== "function") {
    const keys = mod && typeof mod === "object" ? Object.keys(mod) : [];
    throw new TypeError(
      `[app.js] ${name} is not an express router/function. typeof=${typeof r} keys=${keys.join(",")}`
    );
  }
  return r;
}

// Routes
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

// ✅ CHAT ROUTE
const chatRoute = pickRouter(require("./routes/chat/chat"), "chatRoute");

const app = express();

// =====================
// App / Proxy
// =====================
app.set("trust proxy", true);
app.disable("x-powered-by");

// =====================
// Body parsing
// =====================
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// =====================
// CORS
// =====================
app.use(corsMiddleware);

// ✅ allow custom headers (x-role / x-bankcode)
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-role, x-bankcode"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  next();
});

// allow preflight
app.options(/.*/, cors(corsOptions));

// =====================
// Logger
// =====================
app.use(logger);

// =====================
// Static: uploads
// =====================
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    maxAge: "7d",
    etag: true,
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      if ((process.env.CORS_ORIGIN || "*").trim() === "*") {
        res.setHeader("Access-Control-Allow-Origin", "*");
      }
    },
  })
);

// =====================
// Routes
// =====================

// Optimize
app.use("/api/optimize", optimizeRoutes);

// Content
app.use("/api/members", membersRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/announcement", announcementRoutes);

// Jobs
app.use("/api/jobs-list", jobsRoutes);
app.use("/api/jobs", jobsRoutes);

// Org / People
app.use("/api/boarddirector", boarddirectorRoutes);
app.use("/api/emp_lapnet", empLapnetRoutes);

// Visitors
app.use("/api/visitors", visitorsRoutes);
app.use("/api/visitor", visitorsRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Form Templates
app.use("/api/form-templates", formTemplateRoutes);

// Users / Auth
app.use("/api/users", userloginRoutes);
app.use("/api/auth", authRoutes);

// Form submissions
app.use("/api/form-submissions", formSubmissionsRoute);

// Announcements (members bank)
app.use("/api/announcements", announcements);

// Documents
app.use("/api/documents", documentsRoute);

// =====================
// ✅ CHAT (สำคัญ)
// =====================
app.use("/api/chat", chatRoute);
/*
  Available:
  GET    /api/chat/ping
  POST   /api/chat/conversations/ensure
  GET    /api/chat/conversations/:id/messages
  POST   /api/chat/conversations/:id/messages
  GET    /api/chat/admin/banks
*/

// =====================
// Health + Root
// =====================
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("OK");
  } catch {
    res.status(500).send("DB ERROR");
  }
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "API running",
    routes: [
      "/health",

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

// =====================
// 404 + error handlers
// =====================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
