// src/app.js
const express = require("express");
const cors = require("cors");

const { corsMiddleware, corsOptions } = require("./config/cors");
const { UPLOAD_DIR } = require("./config/paths");
const logger = require("./middleware/logger");
const { notFoundHandler, errorHandler } = require("./middleware/errors");

const pool = require("./db/pool");

// Routes
const optimizeRoutes = require("./routes/optimize");
const membersRoutes = require("./routes/members");
const newsRoutes = require("./routes/news");
const announcementRoutes = require("./routes/announcement");
const jobsRoutes = require("./routes/jobs");
const empLapnetRoutes = require("./routes/emp_lapnet");
const notificationRoutes = require("./routes/notifications");
const boarddirectorRoutes = require("./routes/boarddirector");
const visitorsRoutes = require("./routes/visitor/visitors");
const formTemplateRoutes = require("./routes/formtemplete");
const userloginRoutes = require("./routes/login/users");
const authRoutes = require("./routes/login/auth");

const formSubmissionsRoute = require("./routes/submission_form/formSubmissions");
const announcements = require("./routes/membersbank/announcements");
const documentsRoute = require("./routes/uploaddocument/uploaddocument");

// ✅ CHAT ROUTE
const chatRoute = require("./routes/chat/chat");

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
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
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
