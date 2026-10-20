import { beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { logger } from "../src/config/logger.js";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  // Protect production/Atlas database from test mutations
  const testUri = process.env.MONGODB_TEST_URI || "mongodb://127.0.0.1:27017/divyam_ayurveda_test";
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
  logger.info({ database: mongoose.connection.name }, "Connected to dedicated test database");
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

