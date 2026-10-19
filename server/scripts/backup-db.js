import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { config } from "../src/config/index.js";
import { logger } from "../src/config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backupDatabase = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(__dirname, "../backups", `backup_${config.NODE_ENV}_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  logger.info({ backupDir, uri: config.MONGODB_URI }, "Starting database backup...");

  await mongoose.connect(config.MONGODB_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const manifest = {
    timestamp: new Date().toISOString(),
    databaseName: mongoose.connection.name,
    environment: config.NODE_ENV,
    host: mongoose.connection.host,
    collections: {},
  };

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const col = db.collection(colName);
    const docs = await col.find({}).toArray();

    const filePath = path.join(backupDir, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");

    manifest.collections[colName] = {
      count: docs.length,
      file: `${colName}.json`,
      bytes: fs.statSync(filePath).size,
    };

    logger.info({ collection: colName, count: docs.length }, "Backed up collection");
  }

  const manifestPath = path.join(backupDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  logger.info({ manifestPath, totalCollections: collections.length }, "Database backup completed and verified!");

  await mongoose.disconnect();
  return { backupDir, manifest };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  backupDatabase()
    .then((res) => {
      console.log("SUCCESS: Backup created at", res.backupDir);
      process.exit(0);
    })
    .catch((err) => {
      console.error("FATAL: Backup failed:", err);
      process.exit(1);
    });
}

