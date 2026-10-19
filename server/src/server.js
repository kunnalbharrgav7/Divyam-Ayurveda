import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import { connectDB, disconnectDB } from "./db/connection.js";
import { initRedis } from "./config/redis.js";
import { referralService } from "./services/referral.service.js";

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Redis
    initRedis();

    // Pay referral rewards once their orders are delivered and past the return window
    const sweepReferrals = () => referralService.qualifyDue().catch((err) => logger.error({ err: err.message }, "Referral reward sweep failed"));
    setInterval(sweepReferrals, 15 * 60 * 1000).unref();
    sweepReferrals();

    // 3. Start Express server
    const server = app.listen(config.PORT, () => {
      logger.info(
        {
          port: config.PORT,
          env: config.NODE_ENV,
          docs: `http://localhost:${config.PORT}/api/docs`,
        },
        `Divyam Ayurveda API Server running on port ${config.PORT}`
      );
    });

    // 4. Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      logger.info({ signal }, "Received shutdown signal. Closing HTTP server...");
      server.close(async () => {
        logger.info("HTTP server closed. Disconnecting database...");
        await disconnectDB();
        process.exit(0);
      });

      // Force exit if not gracefully closed within 10s
      setTimeout(() => {
        logger.fatal("Forcefully terminating process due to shutdown timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.fatal({ err: error.message }, "Server startup failed");
    process.exit(1);
  }
};

startServer();

