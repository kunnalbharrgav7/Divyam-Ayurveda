import { beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { logger } from "../src/config/logger.js";
import { settingsService } from "../src/services/settings.service.js";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  // Protect production/Atlas database from test mutations
  const testUri = process.env.MONGODB_TEST_URI || "mongodb://127.0.0.1:27017/divyam_ayurveda_test";
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
  logger.info({ database: mongoose.connection.name }, "Connected to dedicated test database");

  // Orders are priced by the server from the saved shipping zones. Most tests are about something else
  // (returns, referrals, revenue...), so give them a known baseline: delivery is free everywhere and the
  // order total equals the goods total. Tests that exercise shipping rules set their own fees.
  const settings = await settingsService.get();
  settings.shipping.zones.forEach((zone) => {
    zone.baseFee = 0;
    zone.freeThreshold = 0;
  });
  settings.shipping.expressShippingFee = 99;
  settings.store.enableCashOnDelivery = true;
  settings.store.enableOnlinePayments = true;
  settings.store.maxCodLimit = 100000;
  await settings.save();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

