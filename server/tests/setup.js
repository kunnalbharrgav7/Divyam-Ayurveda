import { beforeAll, afterAll } from "vitest";
import { connectDB, disconnectDB } from "../src/db/connection.js";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

