// server.js (root)
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const registerChatSocket = require("./src/routes/socket/chatSocket");

console.log("✅ RUNNING FILE:", __filename);

const PORT = Number(process.env.PORT || 3000);

// ✅ IMPORTANT: ต้องสร้าง http server จาก app
const server = http.createServer(app);

// ✅ attach socket.io
const io = new Server(server, {
  cors: {
    origin: true, // หรือใส่เป็น process.env.CORS_ORIGIN
    credentials: true,
  },
  transports: ["websocket"],
});

// (optional) ให้ REST routes เรียก io ได้ด้วย: req.app.get("io")
app.set("io", io);

// register chat socket events
registerChatSocket(io);

// ✅ start
server.listen(PORT, () => {
  console.log(`API+Socket running on http://localhost:${PORT}`);
});
