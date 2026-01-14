// src/app.js
const express = require("express");

const { corsMiddleware, corsOptions } = require("./config/cors");
const { UPLOAD_DIR } = require("./config/paths");
const logger = require("./middleware/logger");
const { notFoundHandler, errorHandler } = require("./middleware/errors");

const optimizeRoutes = require("./routes/optimize");
const membersRoutes = require("./routes/members");
const newsRoutes = require("./routes/news");
const announcementRoutes = require("./routes/announcement");
const jobsRoutes = require("./routes/jobs");
const emp_lapnetRoutes = require("./routes/emp_lapnet");

const notificationRoute = require("./routes/notifications")
const formRoute = require("./routes/form")


// ✅ ADD: boarddirector routes
const boarddirectorRoutes = require("./routes/boarddirector");

// ✅ ADD: visitors routes
const visitorsRoutes = require("./routes/visitor/visitors");





const app = express();

app.set("trust proxy", true);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));


// ✅ CORS
app.use(corsMiddleware);
app.options(/.*/, require("cors")(corsOptions)); // ✅ FIX: Express/router new versions



// logger
app.use(logger);

// ✅ Serve uploads static
app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
        maxAge: "7d",
        etag: true,
        setHeaders(res) {
            res.setHeader("X-Content-Type-Options", "nosniff");
            // allow public fetch when CORS_ORIGIN="*"
            if ((process.env.CORS_ORIGIN || "*").trim() === "*") {
                res.setHeader("Access-Control-Allow-Origin", "*");
            }
        },
    })
);

// Routes
app.use("/api", optimizeRoutes);

app.use("/api/members", membersRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/announcement", announcementRoutes);

// ✅ Mount jobs_list routes at BOTH: /api/jobs-list AND /api/jobs
app.use("/api/jobs-list", jobsRoutes);
app.use("/api/jobs", jobsRoutes);

// ✅ ADD: boarddirector API
app.use("/api/boarddirector", boarddirectorRoutes);

// Emp_lapnet API Route
app.use("/api/emp_lapnet", emp_lapnetRoutes);

// ✅ ADD: visitors API Route
app.use("/api/visitors", visitorsRoutes);
app.use("/api/visitor", visitorsRoutes);


app.use("/api/notifications", notificationRoute);

app.use("/api/forms", formRoute);


// Health + Root
const pool = require("./db/pool");


// body parsers
// body parsers (ใช้ชุดเดียวพอ และต้องอยู่ก่อน routes)


app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.send("OK");
    } catch {
        res.status(500).send("DB ERROR");
    }
});

app.get("/", (req, res) => {
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

            // ✅ ADD visitors
            "/api/visitors/track (POST)",
            "/api/visitors/ping (POST)",
            "/api/visitors/stats?range=7d (GET)",
            "/api/visitors/realtime?windowSec=300 (GET)",
            "/api/visitors/realtime/stream?windowSec=300 (GET - SSE)",
        ],
    });
});

// 404 + error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
