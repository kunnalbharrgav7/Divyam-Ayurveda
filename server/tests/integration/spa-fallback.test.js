import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import app from "../../src/app.js";

// A stand-in for the built storefront, so the test does not depend on a real client build being present
let dist;
let previous;

describe.sequential("Page addresses are served by the storefront, not a JSON 404", () => {
  beforeAll(() => {
    previous = process.env.CLIENT_DIST_PATH;
    dist = fs.mkdtempSync(path.join(os.tmpdir(), "divyam-dist-"));
    fs.writeFileSync(path.join(dist, "index.html"), "<!doctype html><title>Divyam storefront</title><div id=root></div>");
    fs.mkdirSync(path.join(dist, "assets"));
    fs.writeFileSync(path.join(dist, "assets", "app.js"), "console.log('app')");
    fs.mkdirSync(path.join(dist, "about"));
    fs.writeFileSync(path.join(dist, "about", "index.html"), "<!doctype html><title>About prerendered</title>");
    process.env.CLIENT_DIST_PATH = dist;
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.CLIENT_DIST_PATH;
    else process.env.CLIENT_DIST_PATH = previous;
    fs.rmSync(dist, { recursive: true, force: true });
  });

  it("reloading or opening a shared link to a storefront page returns the app, whatever the address", async () => {
    for (const url of ["/login", "/cart", "/account/orders", "/checkout", "/track-order?orderId=DA-1", "/order-confirmation/DA-20261105-1", "/admin/orders", "/products/some-new-product-slug"]) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(200);
      expect(res.headers["content-type"], url).toMatch(/text\/html/);
      expect(res.text, url).toContain("Divyam storefront");
    }
  });

  it("the home page and real files are served as they are, and a prerendered page keeps its own file", async () => {
    expect((await request(app).get("/")).text).toContain("Divyam storefront");
    const asset = await request(app).get("/assets/app.js");
    expect(asset.status).toBe(200);
    expect(asset.text).toContain("console.log");
    expect((await request(app).get("/about/")).text).toContain("About prerendered");
  });

  it("the API, health checks and missing files still get honest answers", async () => {
    expect((await request(app).get("/health")).body.status).toBe("healthy");

    const missingApi = await request(app).get("/api/v1/no-such-endpoint");
    expect(missingApi.status).toBe(404);
    expect(missingApi.body.success).toBe(false);

    // a stale script or image must fail, not come back as a page
    const missingFile = await request(app).get("/assets/old-chunk-abc123.js");
    expect(missingFile.status).toBe(404);
    expect(missingFile.headers["content-type"]).toMatch(/json/);

    // only page loads are redirected to the app; other methods keep their meaning
    expect((await request(app).post("/login").send({})).status).toBe(404);
  });
});
