const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");
const { ensureDemoAccounts } = require("./services/demoAccountService");
const { ensureDemoData } = require("./services/demoDataService");

const PORT = Number(process.env.PORT || 5001);

async function startServer() {
  await connectDB();
  await ensureDemoAccounts();
  await ensureDemoData();

  const server = app.listen(PORT, () => {
    console.log(`School Manager API running at http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Close the other server or set PORT=5002 in .env and update client/vite.config.js proxy target.`);
      process.exit(1);
    }
    throw error;
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
