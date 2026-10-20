import { MongoClient } from "mongodb";
import { config } from "../src/config/index.js";

async function audit() {
  const localUri = "mongodb://127.0.0.1:27017/divyam_ayurveda";
  const atlasUri = config.MONGODB_URI;

  console.log("=== DIVYAM AYURVEDA DATABASE MIGRATION AUDIT ===");
  console.log("Local URI:", localUri);
  // Mask atlas credentials for privacy
  const maskedAtlasUri = atlasUri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
  console.log("Atlas URI:", maskedAtlasUri);

  const localClient = new MongoClient(localUri);
  const atlasClient = new MongoClient(atlasUri);

  try {
    await localClient.connect();
    console.log("\n[SUCCESS] Connected to Local MongoDB!");
  } catch (err) {
    console.error("[ERROR] Failed to connect to Local MongoDB:", err.message);
    process.exit(1);
  }

  try {
    await atlasClient.connect();
    console.log("[SUCCESS] Connected to MongoDB Atlas!");
  } catch (err) {
    console.error("[ERROR] Failed to connect to MongoDB Atlas:", err.message);
    process.exit(1);
  }

  const localDb = localClient.db("divyam_ayurveda");
  // Extract database name from Atlas connection
  const atlasDbName = atlasClient.db().databaseName;
  const atlasDb = atlasClient.db();

  console.log(`\nLocal Database Name:  "${localDb.databaseName}"`);
  console.log(`Atlas Database Name:  "${atlasDbName}"`);

  // List all collections from both
  const localColInfos = await localDb.listCollections().toArray();
  const atlasColInfos = await atlasDb.listCollections().toArray();

  const localCols = localColInfos.map((c) => c.name).sort();
  const atlasCols = atlasColInfos.map((c) => c.name).sort();

  console.log(`\nLocal Collections Found: ${localCols.length}`);
  console.log(`Atlas Collections Found: ${atlasCols.length}`);

  const allCollectionNames = Array.from(new Set([...localCols, ...atlasCols])).sort();

  console.log("\n" + "-".repeat(85));
  console.log(
    "Collection Name".padEnd(25) +
      " | Local Docs".padEnd(14) +
      " | Local Idx".padEnd(12) +
      " | Atlas Docs".padEnd(14) +
      " | Atlas Idx".padEnd(12) +
      " | Status"
  );
  console.log("-".repeat(85));

  const auditReport = [];

  for (const name of allCollectionNames) {
    let localCount = 0;
    let localIndexes = [];
    let atlasCount = 0;
    let atlasIndexes = [];
    const onLocal = localCols.includes(name);
    const onAtlas = atlasCols.includes(name);

    if (onLocal) {
      localCount = await localDb.collection(name).countDocuments();
      localIndexes = await localDb.collection(name).indexes();
    }
    if (onAtlas) {
      atlasCount = await atlasDb.collection(name).countDocuments();
      atlasIndexes = await atlasDb.collection(name).indexes();
    }

    let status = "MATCH";
    if (!onLocal) status = "ATLAS_ONLY";
    else if (!onAtlas) status = "LOCAL_ONLY";
    else if (localCount !== atlasCount) status = "COUNT_MISMATCH";

    console.log(
      name.padEnd(25) +
        " | " +
        (onLocal ? String(localCount) : "N/A").padEnd(12) +
        " | " +
        (onLocal ? String(localIndexes.length) : "N/A").padEnd(10) +
        " | " +
        (onAtlas ? String(atlasCount) : "N/A").padEnd(12) +
        " | " +
        (onAtlas ? String(atlasIndexes.length) : "N/A").padEnd(10) +
        " | " +
        status
    );

    auditReport.push({
      name,
      onLocal,
      onAtlas,
      localCount,
      localIndexes,
      atlasCount,
      atlasIndexes,
      status,
    });
  }
  console.log("-".repeat(85));

  // Inspect users in local database
  const localUsers = await localDb.collection("users").find({}).toArray();
  console.log(`\nLocal Users Breakdown (${localUsers.length} total):`);
  localUsers.forEach((u) => {
    console.log(` - ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Staff: ${u.isStaff} | Status: ${u.status}`);
  });

  // Inspect roles in local database
  const localRoles = await localDb.collection("roles").find({}).toArray();
  console.log(`\nLocal Roles Breakdown (${localRoles.length} total):`);
  localRoles.forEach((r) => {
    console.log(` - ID: ${r._id} | Name: ${r.name} | Permissions: ${r.permissions?.length || 0}`);
  });

  // Inspect products in local database
  const localProducts = await localDb.collection("products").find({}).toArray();
  console.log(`\nLocal Products Breakdown (${localProducts.length} total):`);
  localProducts.forEach((p) => {
    console.log(` - ID: ${p._id} | Name: ${p.name} | Slug: ${p.slug} | Category: ${p.category} | Stock: ${p.stockQuantity ?? p.stock}`);
  });

  // Inspect orders in local database
  const localOrders = await localDb.collection("orders").find({}).toArray();
  console.log(`\nLocal Orders Breakdown (${localOrders.length} total):`);
  localOrders.forEach((o) => {
    console.log(` - ID: ${o._id} | Order#: ${o.orderNumber} | Customer: ${o.shippingAddress?.fullName || o.customerName} | Total: ${o.totalAmount || o.pricing?.total} | Status: ${o.orderStatus || o.status}`);
  });

  await localClient.close();
  await atlasClient.close();
  console.log("\n[SUCCESS] Audit phase complete!");
}

audit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});

