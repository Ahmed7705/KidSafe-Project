import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import childrenRoutes from "./routes/children.js";
import blocklistRoutes from "./routes/blocklist.js";
import logsRoutes from "./routes/logs.js";
import alertsRoutes from "./routes/alerts.js";
import extensionRoutes from "./routes/extension.js";
import screentimeRoutes from "./routes/screentime.js";
import appsRoutes from "./routes/apps.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    }
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/children", childrenRoutes);
app.use("/api/blocklist", blocklistRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/extension", extensionRoutes);
app.use("/api/screentime", screentimeRoutes);
app.use("/api/apps", appsRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`KidSafe API listening on port ${port}`);
});
