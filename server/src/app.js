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
import sitemapRoutes from "./routes/sitemap.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where the built storefront (index.html + assets) lives. The server serves it for every page address, so reloading
// /login or opening a shared link works. Looked for, in order: CLIENT_DIST_PATH, the repo's client/dist, and a
// public_html folder next to the app (shared hosting). Checked lazily, so uploading a new build needs no restart.
const clientDistCandidates = () =>
  [
    process.env.CLIENT_DIST_PATH,
    path.resolve(__dirname, "../../client/dist"),
    path.resolve(process.cwd(), "../public_html"),
    path.resolve(process.cwd(), "../../public_html"),
  ]
    .filter(Boolean)
    .map((p) => path.resolve(p));

let clientDistCache = { key: null, at: 0, dir: null };
const findClientDist = () => {
  const key = process.env.CLIENT_DIST_PATH || "";
  if (clientDistCache.key === key && Date.now() - clientDistCache.at < 10000) return clientDistCache.dir;
  const dir = clientDistCandidates().find((p) => fs.existsSync(path.join(p, "index.html"))) || null;
  clientDistCache = { key, at: Date.now(), dir };
  return dir;
};

const staticByDir = new Map();
const serveClientStatic = (req, res, next) => {
  const dir = findClientDist();
  if (!dir) return next();
  if (!staticByDir.has(dir)) staticByDir.set(dir, express.static(dir));
  return staticByDir.get(dir)(req, res, next);
};

const app = express();

// Render gives the static frontend a generated hostname.  Keep an explicit
// production allowlist (with an environment override for custom domains) so
// credentialed PATCH/DELETE responses always carry the same CORS headers as
// their OPTIONS preflight response.
const allowedOrigins = new Set(
  [
    config.CLIENT_ORIGIN,
    "https://divyam-ayurveda-dgha.onrender.com",
    // The storefront is reachable with and without "www"; both must be allowed or login from the other one fails
    "https://divyamayurveda.in",
    "https://www.divyamayurveda.in",
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
app.use(serveClientStatic);

app.get("/", (req, res) => {
  const clientDist = findClientDist();
  if (clientDist) {
    return res.sendFile(path.join(clientDist, "index.html"));
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

// Sitemap for search engines
app.use(sitemapRoutes);

// 6. OpenAPI Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// 7. Mount Versioned API Routes (/api/v1)
app.use("/api/v1", v1Routes);

// SPA client fallback: any other page address gets the storefront, and the React router shows the right page.
// API calls, health checks and anything that looks like a missing file (a stale script or image) still get a real 404.
app.use((req, res, next) => {
  const clientDist = findClientDist();
  if (
    !clientDist ||
    req.method !== "GET" ||
    req.originalUrl.startsWith("/api") ||
    req.originalUrl.startsWith("/health") ||
    req.originalUrl.startsWith("/ready") ||
    /\.[a-z0-9]{1,8}$/i.test(req.path)
  ) {
    return next();
  }
  return res.sendFile(path.join(clientDist, "index.html"));
});

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

