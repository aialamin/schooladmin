const compression = require("compression");
const cors = require("cors");
const express = require("express");
const path = require("path");
const { noStore } = require("./middleware/cacheHeaders");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const authRoutes = require("./routes/authRoutes");
const classFeeRoutes = require("./routes/classFeeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const healthRoutes = require("./routes/healthRoutes");
const incrementRoutes = require("./routes/incrementRoutes");
const markRoutes = require("./routes/markRoutes");
const routineRoutes = require("./routes/routineRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const schoolSettingRoutes = require("./routes/schoolSettingRoutes");
const studentRoutes = require("./routes/studentRoutes");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const classroomRoutes = require("./routes/classroomRoutes");
const dbConfigRoutes = require("./routes/dbConfigRoutes");
const leaveRoutes    = require("./routes/leaveRoutes");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
const corsOptions = corsOrigin === "*"
  ? {}
  : { origin: corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean) };

app.use(cors(corsOptions));
// Gzip compress all responses — reduces JSON payload size by 60-80%
app.use(compression());
app.use(express.json({ limit: "5mb" }));

// Safety net for older frontend builds or misconfigured env values that send /api/api/...
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/api/")) {
    req.url = req.url.replace("/api/api/", "/api/");
  }
  next();
});

// Prevent browsers, proxies, and CDNs from caching any API response.
// Must come before all route handlers.
app.use("/api", noStore);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/class-fees", classFeeRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/marks", markRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/salary-increments", incrementRoutes);
app.use("/api/school-settings", schoolSettingRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/db-config", dbConfigRoutes);
app.use("/api/leaves",    leaveRoutes);

// Serve the built React frontend when running only the backend server.
const clientDistPath = path.join(__dirname, "..", "client", "dist");
const clientAssetsPath = path.join(clientDistPath, "assets");

app.use(
  express.static(clientDistPath, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      if (filePath.startsWith(clientAssetsPath)) {
        // Vite fingerprints every asset filename with a content hash (e.g. index-BIZR71-c.js),
        // so these files are safe to cache forever — the URL changes when content changes.
        res.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith("index.html")) {
        // Must always revalidate so the browser picks up new asset hashes after a deploy.
        res.set("Cache-Control", "no-cache");
      } else {
        // Favicons, app icons, logo images — cache for 1 day.
        res.set("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDistPath, "index.html"), (error) => {
    if (error) next();
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
