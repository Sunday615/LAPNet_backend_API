// server.js (root)
require("dotenv").config();

const app = require("./src/app");

console.log("✅ RUNNING FILE:", __filename);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
