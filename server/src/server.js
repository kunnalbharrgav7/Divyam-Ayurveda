import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import { connectDB, disconnectDB } from "./db/connection.js";
import { referralService } from "./services/referral.service.js";
import { orderService } from "./services/order.service.js";
import { paymentService } from "./services/payment.service.js";
import { shipmentService } from "./services/shipment.service.js";
import { Shipment } from "./models/Shipment.js";

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // Older databases hold a plain orderNumber index; replace it with the unique one that stops double shipments
    await Shipment.syncIndexes().catch((err) =>
      logger.error({ err: err.message }, "Could not enforce one shipment per order; remove duplicate shipments and restart")
    );

    // Pay referral rewards once their orders are delivered and past the return window
    const sweepReferrals = () => referralService.qualifyDue().catch((err) => logger.error({ err: err.message }, "Referral reward sweep failed"));
    setInterval(sweepReferrals, 15 * 60 * 1000).unref();
    sweepReferrals();

    // Cancel online orders that were never paid so their reserved stock goes back on sale
    const sweepUnpaidOrders = () => orderService.expireUnpaidOrders().catch((err) => logger.error({ err: err.message }, "Unpaid order sweep failed"));
    // (production, or set ENABLE_ORDER_EXPIRY=true; a local run against a shared database should not cancel orders)
    if (config.NODE_ENV === "production" || process.env.ENABLE_ORDER_EXPIRY === "true") {
      setInterval(sweepUnpaidOrders, 15 * 60 * 1000).unref();
      sweepUnpaidOrders();
      // Safety net for the tracking webhook: read the courier's own status for open shipments every 30 minutes
      const sweepTracking = () => shipmentService.syncOpenShipments().catch((err) => logger.error({ err: err.message }, "Shipment tracking refresh failed"));
      setInterval(sweepTracking, 30 * 60 * 1000).unref();
      sweepTracking();
      const sweepRefunds = () => paymentService.syncPendingCancelRefunds().catch((err) => logger.error({ err: err.message }, "Pending refund check failed"));
      setInterval(sweepRefunds, 15 * 60 * 1000).unref();
      sweepRefunds();
    }

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

