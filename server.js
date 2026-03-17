require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const registerChatSocket = require("./src/routes/socket/chatSocket");

const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const PORT = Number(process.env.PORT || 3000);

function parseAllowedOrigins(raw) {
  if (!raw || typeof raw !== "string") {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createSocketOriginChecker(origins, productionMode) {
  return (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (!productionMode && origins.length === 0) {
      return callback(null, true);
    }

    if (origins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Socket origin not allowed"));
  };
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);
const socketOriginChecker = createSocketOriginChecker(allowedOrigins, isProd);

const server = http.createServer(app);

server.requestTimeout = Number(process.env.SERVER_REQUEST_TIMEOUT_MS || 30000);
server.headersTimeout = Number(process.env.SERVER_HEADERS_TIMEOUT_MS || 35000);
server.keepAliveTimeout = Number(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS || 65000);

const io = new Server(server, {
  path: process.env.SOCKET_PATH || "/socket.io",
  cors: {
    origin: socketOriginChecker,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  serveClient: false,
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS || 25000),
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT_MS || 20000),
});

app.set("io", io);

registerChatSocket(io);

server.on("error", (error) => {
  console.error("[server] Startup error:", error);

  if (error && error.code === "EADDRINUSE") {
    console.error(`[server] Port ${PORT} is already in use.`);
  }

  process.exit(1);
});

let isShuttingDown = false;

function shutdown(signal, error) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (error) {
    console.error(`[server] Shutdown triggered by ${signal}:`, error);
  } else {
    console.log(`[server] ${signal} received. Starting graceful shutdown.`);
  }

  const forceExitTimer = setTimeout(() => {
    console.error("[server] Force exit due to shutdown timeout.");
    process.exit(error ? 1 : 0);
  }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000));

  forceExitTimer.unref();

  io.close(() => {
    server.close((serverError) => {
      clearTimeout(forceExitTimer);

      if (serverError) {
        console.error("[server] Error during shutdown:", serverError);
        process.exit(1);
        return;
      }

      console.log("[server] Shutdown completed.");
      process.exit(error ? 1 : 0);
    });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  shutdown("uncaughtException", error);
});

server.listen(PORT, () => {
  console.log(`[server] API + Socket listening on port ${PORT}`);
});