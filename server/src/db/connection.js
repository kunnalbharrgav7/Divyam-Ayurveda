import mongoose from "mongoose";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      autoIndex: config.NODE_ENV !== "production",
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(
      { host: conn.connection.host, database: conn.connection.name },
      "MongoDB database connected successfully"
    );

    mongoose.connection.on("error", (err) => {
      logger.error({ err }, "MongoDB runtime connection error");
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB connection disconnected");
    });

    return conn;
  } catch (error) {
    logger.fatal({ error: error.message }, "MongoDB initial connection failed");
    if (config.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected gracefully");
};
