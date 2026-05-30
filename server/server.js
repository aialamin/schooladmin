const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");
const { ensureDemoAccounts } = require("./services/demoAccountService");
const { ensureDemoData } = require("./services/demoDataService");
const { scheduleAnnualPromotion } = require("./services/promotionService");

const PORT = Number(process.env.PORT || 5001);

// ── Open the port FIRST so Render / any host detects it immediately ──────────
// Binding to 0.0.0.0 is required on cloud hosts (Render, Railway, Fly.io, etc.)
// because they route traffic to the container IP, not 127.0.0.1.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`School Manager API listening on port ${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Set a different PORT in your environment.`
    );
    process.exit(1);
  }
  throw error;
});

// ── Connect to MongoDB and seed data after the port is open ──────────────────
// Any requests that arrive before the DB is ready will get a 503 from the
// error handler, which is acceptable for the brief startup window.
async function initializeApp() {
  try {
    await connectDB();
    await ensureDemoAccounts();
    await ensureDemoData();
    scheduleAnnualPromotion(); // auto-run on January 1st every year
    console.log("Database connected and ready.");
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

initializeApp();
