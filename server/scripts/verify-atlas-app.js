// verify-atlas-app.js
// Verification suite testing end-to-end compatibility of Divyam Ayurveda on MongoDB Atlas

const API_BASE = "http://localhost:5000";

async function runTests() {
  console.log("==========================================================");
  console.log("   DIVYAM AYURVEDA MONGODB ATLAS END-TO-END VERIFICATION  ");
  console.log("==========================================================");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      const res = await fn();
      console.log(`[PASS] ${name}`);
      passed++;
      return res;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
      return null;
    }
  }

  // 1. Health & Readiness
  await test("GET /health -> status: healthy", async () => {
    const res = await fetch(`${API_BASE}/health`).then((r) => r.json());
    if (res.status !== "healthy") throw new Error(JSON.stringify(res));
  });

  await test("GET /ready -> database: connected", async () => {
    const res = await fetch(`${API_BASE}/ready`).then((r) => r.json());
    if (!res.ready || res.database !== "connected") throw new Error(JSON.stringify(res));
  });

  // 2. Public Catalog Reads
  let sampleProductSlug = "";
  await test("GET /api/v1/categories -> returns categories", async () => {
    const res = await fetch(`${API_BASE}/api/v1/categories`).then((r) => r.json());
    if (!res.success || !Array.isArray(res.data) || res.data.length === 0)
      throw new Error("Invalid categories response");
    console.log(`       Found ${res.data.length} categories (${res.data.map((c) => c.name).join(", ")})`);
  });

  await test("GET /api/v1/products -> returns products", async () => {
    const res = await fetch(`${API_BASE}/api/v1/products`).then((r) => r.json());
    const products = res.data?.products || res.data;
    if (!res.success || !Array.isArray(products) || products.length === 0)
      throw new Error("Invalid products response");
    sampleProductSlug = products[0].slug;
    console.log(`       Found ${products.length} products. Sample slug: "${sampleProductSlug}"`);
  });

  await test(`GET /api/v1/products/${sampleProductSlug} -> returns single product`, async () => {
    const res = await fetch(`${API_BASE}/api/v1/products/${sampleProductSlug}`).then((r) => r.json());
    if (!res.success || !res.data) throw new Error("Product detail failed");
    console.log(`       Product: "${res.data.name}", Price: ${res.data.price}`);
  });

  await test("GET /api/v1/blog -> returns blog posts", async () => {
    const res = await fetch(`${API_BASE}/api/v1/blog`).then((r) => r.json());
    const posts = res.data?.posts || res.data;
    if (!res.success || !Array.isArray(posts) || posts.length === 0)
      throw new Error("Invalid blog response");
    console.log(`       Found ${posts.length} blog posts`);
  });

  await test("GET /api/v1/store/homepage -> returns homepage configuration", async () => {
    const res = await fetch(`${API_BASE}/api/v1/store/homepage`).then((r) => r.json());
    if (!res.success || !res.data) throw new Error("Homepage config failed");
  });

  // 3. Admin Authentication
  let adminToken = "";
  await test("POST /api/v1/auth/staff/login -> Super Admin authenticates successfully", async () => {
    const res = await fetch(`${API_BASE}/api/v1/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@divyamayurveda.demo",
        password: "DivyamAdmin!2026",
      }),
    }).then((r) => r.json());

    if (!res.success || !res.data?.tokens?.accessToken)
      throw new Error(res.error?.message || "Failed to log in as admin");

    adminToken = res.data.tokens.accessToken;
    console.log(`       Admin logged in: ${res.data.user?.name} (Staff: ${res.data.user?.isStaff})`);
  });

  // 4. Admin Endpoints with JWT
  if (adminToken) {
    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    };

    await test("GET /api/v1/admin/dashboard -> returns admin metrics", async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/dashboard`, { headers: adminHeaders }).then((r) =>
        r.json()
      );
      if (!res.success) throw new Error(res.error?.message || "Admin dashboard failed");
      console.log(`       Metrics: Total Orders=${res.data?.stats?.totalOrders ?? 'N/A'}, Revenue=${res.data?.stats?.totalRevenue ?? 'N/A'}`);
    });

    await test("GET /api/v1/admin/products -> lists admin catalog products", async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/products`, { headers: adminHeaders }).then((r) =>
        r.json()
      );
      const products = res.data?.products || res.data;
      if (!res.success || !Array.isArray(products)) throw new Error("Failed to list admin products");
      console.log(`       Admin listed ${products.length} products`);
    });

    await test("GET /api/v1/admin/orders -> lists orders", async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders`, { headers: adminHeaders }).then((r) =>
        r.json()
      );
      const orders = res.data?.orders || res.data;
      if (!res.success || !Array.isArray(orders)) throw new Error("Failed to list admin orders");
      console.log(`       Admin listed ${orders.length} orders`);
    });
  }

  // 5. Customer Authentication & Operations (Register Temporary Customer -> Verify Profile/Cart -> Cleanup)
  const tempEmail = `atlas_verify_${Date.now()}@example.com`;
  const tempPassword = "VerifyPass!123";
  let customerToken = "";

  await test("POST /api/v1/auth/register -> Registers test customer", async () => {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Atlas Test Customer",
        email: tempEmail,
        password: tempPassword,
        phone: "9988776655",
      }),
    }).then((r) => r.json());

    if (!res.success || !res.data?.tokens?.accessToken)
      throw new Error(res.error?.message || "Customer registration failed");

    customerToken = res.data.tokens.accessToken;
    console.log(`       Customer registered and authenticated: ${res.data.user?.email}`);
  });

  // 6. Customer Endpoints
  if (customerToken) {
    const customerHeaders = {
      Authorization: `Bearer ${customerToken}`,
      "Content-Type": "application/json",
    };

    await test("GET /api/v1/me -> customer profile loaded", async () => {
      const res = await fetch(`${API_BASE}/api/v1/me`, { headers: customerHeaders }).then((r) =>
        r.json()
      );
      if (!res.success || !res.data) throw new Error("Failed to fetch customer profile");
      console.log(`       Profile: ${res.data.name}, Phone: ${res.data.phone}`);
    });

    await test("GET /api/v1/me/orders -> customer orders loaded", async () => {
      const res = await fetch(`${API_BASE}/api/v1/me/orders`, { headers: customerHeaders }).then((r) =>
        r.json()
      );
      const orders = res.data?.orders || res.data;
      if (!res.success || !Array.isArray(orders)) throw new Error("Failed to fetch customer orders");
      console.log(`       Customer has ${orders.length} orders`);
    });

    await test("GET /api/v1/me/cart -> customer cart loaded", async () => {
      const res = await fetch(`${API_BASE}/api/v1/me/cart`, { headers: customerHeaders }).then((r) =>
        r.json()
      );
      if (!res.success) throw new Error("Failed to fetch customer cart");
    });
  }

  // Cleanup temporary test customer directly from Atlas
  try {
    const { MongoClient } = await import("../node_modules/mongodb/lib/index.js");
    const { config } = await import("../src/config/index.js");
    const client = new MongoClient(config.MONGODB_URI);
    await client.connect();
    await client.db().collection("users").deleteOne({ email: tempEmail });
    await client.close();
  } catch {}

  // 7. Order Tracking
  await test("GET /api/v1/orders/track?orderNumber=DA-20261019-423494&email=customer@gmail.com -> tracks order", async () => {
    const res = await fetch(
      `${API_BASE}/api/v1/orders/track?orderNumber=DA-20261019-423494&email=customer@gmail.com`
    ).then((r) => r.json());
    if (!res.success || !res.data) throw new Error(res.error?.message || "Track order failed");
    console.log(`       Order #${res.data.orderNumber} Status: ${res.data.orderStatus || res.data.status}`);
  });

  console.log("\n==========================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");
}

runTests().catch(console.error);
