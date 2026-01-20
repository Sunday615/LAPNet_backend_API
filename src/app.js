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

const formSubmissionsRoute = require('./routes/submission_form/formSubmissions')

const app = express();

// =====================
// App / Proxy
// =====================
app.set("trust proxy", true);

// =====================
// Body parsing
// =====================
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// =====================
// CORS
// =====================
app.use(corsMiddleware);
app.options(/.*/, cors(corsOptions)); // allow preflight for all routes

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

// Base /api (optimize etc.)
app.use("/api", optimizeRoutes);

// Content
app.use("/api/members", membersRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/announcement", announcementRoutes);

// Jobs (mount both /jobs-list and /jobs)
app.use("/api/jobs-list", jobsRoutes);
app.use("/api/jobs", jobsRoutes);

// Org / People
app.use("/api/boarddirector", boarddirectorRoutes);
app.use("/api/emp_lapnet", empLapnetRoutes);

// Visitors (keep both)
app.use("/api/visitors", visitorsRoutes);
app.use("/api/visitor", visitorsRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Form Templates
app.use("/api/form-templates", formTemplateRoutes);


// ✅ Users / Login
app.use("/api/users", userloginRoutes);

// ✅ Auth (login)
app.use("/api/auth", authRoutes);

app.use("/api/form-submissions", formSubmissionsRoute);


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
      "/api/optimize (POST multipart: file)",

      "/api/jobs (GET, POST)",
      "/api/jobs/:id (GET, PATCH, DELETE)",
      "/api/jobs-list (GET, POST)",
      "/api/jobs-list/:id (GET, PATCH, DELETE)",

      "/api/members (GET, POST)",
      "/api/members/:id (GET, PATCH, DELETE)",

      "/api/news (GET, POST)",
      "/api/news/:id (GET, PATCH, DELETE)",
      "/api/news/insert (POST multipart)  (alias of POST /api/news)",

      "/api/announcement (GET, POST multipart/json)",
      "/api/announcement/:id (GET, PATCH, DELETE)",

      "/api/boarddirector (GET, POST)",
      "/api/boarddirector/:id (GET, PATCH, DELETE)",

      "/api/emp_lapnet (GET, POST)",
      "/api/emp_lapnet/:id (GET, PATCH, DELETE)",

      "/api/notifications (GET/POST/...)",

      // visitors
      "/api/visitors/track (POST)",
      "/api/visitors/ping (POST)",
      "/api/visitors/stats?range=7d (GET)",
      "/api/visitors/realtime?windowSec=300 (GET)",
      "/api/visitors/realtime/stream?windowSec=300 (GET - SSE)",

      // form templates
      "/api/form-templates (GET)",
      "/api/form-templates/upsert (POST)",
      "/api/form-templates/:id/activetoggle (PATCH)",
      "/api/form-templates/:id (DELETE)",
      "/api/form-templates (DELETE all)",

      // ✅ user / login
      "/api/users (POST create user)",
      "/api/users (GET list users) (if implemented)",
      "/api/users/:id (PATCH/DELETE) (if implemented)",
      "/api/auth/login (POST) (if implemented in your routes)",
         // ✅ form  / submissions
  
  
    ],
  });
});

// =====================
// 404 + error handlers
// =====================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
