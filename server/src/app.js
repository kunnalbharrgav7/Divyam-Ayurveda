import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { config } from "./config/index.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { openApiSpec } from "./docs/openapi.js";
import v1Routes from "./routes/v1/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const hasClientBuild = fs.existsSync(clientDistPath) && fs.existsSync(path.join(clientDistPath, "index.html"));

const app = express();

// Render gives the static frontend a generated hostname.  Keep an explicit
// production allowlist (with an environment override for custom domains) so
// credentialed PATCH/DELETE responses always carry the same CORS headers as
// their OPTIONS preflight response.
const allowedOrigins = new Set(
  [
    config.CLIENT_ORIGIN,
    "https://divyam-ayurveda-dgha.onrender.com",
    ...(process.env.CLIENT_ORIGINS || "").split(","),
  ]
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean)
);

// 1. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: config.NODE_ENV === "production" ? undefined : false,
  })
);

// 2. CORS Allowlist
app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin?.replace(/\/+$/, "");
      // Allow local development, configured frontends, and non-browser callers.
      if (!normalizedOrigin || normalizedOrigin.startsWith("http://localhost:") || allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin is not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Guest-Token", "X-Request-Id"],
  })
);

// 3. Request parsing with raw buffer capture for HMAC webhook verification
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf-8");
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(compression());

// 4. Request ID & Request logging
app.use(requestId);

// 5. System Health & Readiness Endpoints
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/ready", (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  const isReady = isDbReady;
  const status = isReady ? 200 : 503;

  res.status(status).json({
    ready: isReady,
    database: isDbReady ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Root handler: Serve React frontend if built, or API status JSON
if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}

app.get("/", (req, res) => {
  if (hasClientBuild) {
    return res.sendFile(path.join(clientDistPath, "index.html"));
  }
  return res.status(200).json({
    success: true,
    service: "Divyam Ayurveda REST API",
    version: "1.0.0",
    status: "healthy",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    documentation: "/api/docs",
    healthCheck: "/health",
    readiness: "/ready",
  });
});

// 6. OpenAPI Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// 7. Mount Versioned API Routes (/api/v1)
app.use("/api/v1", v1Routes);

// SPA client fallback for non-API routes when client build exists
if (hasClientBuild) {
  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      req.originalUrl.startsWith("/api") ||
      req.originalUrl.startsWith("/health") ||
      req.originalUrl.startsWith("/ready")
    ) {
      return next();
    }
    return res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// 8. 404 Catch-All Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
      requestId: req.id,
    },
  });
});

// 9. Central Global Error Handling Middleware
app.use(errorHandler);

export default app;

