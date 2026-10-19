import { connectDB } from "../src/db/connection.js";
import { BlogPost } from "../src/models/BlogPost.js";
import { User } from "../src/models/User.js";
import { generateAccessToken } from "../src/utils/token.js";

async function verify() {
  await connectDB();
  console.log("--- 1. Checking Public Blog Articles in MongoDB ---");
  const posts = await BlogPost.find({ status: { $in: ["published", "Published"] } }).sort({ publishedAt: -1 });
  console.log(`Found ${posts.length} published articles:`);
  posts.forEach((p) => console.log(` - [${p.slug}] ${p.title} (${p.category})`));

  if (posts.length === 0) {
    throw new Error("FAIL: Expected published articles in DB, found none!");
  }

  const dinacharya = await BlogPost.findOne({ slug: "5-morning-dinacharya-rituals-for-a-healthier-lifestyle" });
  if (!dinacharya) {
    throw new Error("FAIL: 5 Morning Dinacharya Rituals article not found in DB!");
  }
  console.log("PASS: Found Dinacharya article with title:", dinacharya.title);
  console.log("PASS: Author:", dinacharya.author, "| Read Time:", dinacharya.readTime);
  console.log("PASS: Excerpt length:", dinacharya.excerpt.length, "chars | Content length:", dinacharya.content.length, "chars");

  console.log("\n--- 2. Testing HTTP Public Endpoints (Simulated API Fetch) ---");
  const baseUrl = "http://localhost:5000/api/v1";

  const publicRes = await fetch(`${baseUrl}/blog`);
  const publicJson = await publicRes.json();
  if (!publicJson.success || !Array.isArray(publicJson.data) || publicJson.data.length === 0) {
    throw new Error("FAIL: Public GET /api/v1/blog did not return posts!");
  }
  console.log(`PASS: GET /api/v1/blog returned HTTP 200 with ${publicJson.data.length} articles`);

  const slugRes = await fetch(`${baseUrl}/blog/5-morning-dinacharya-rituals-for-a-healthier-lifestyle`);
  const slugJson = await slugRes.json();
  if (!slugJson.success || !slugJson.data || slugJson.data.title !== dinacharya.title) {
    throw new Error("FAIL: GET /api/v1/blog/:slug did not return expected article!");
  }
  console.log("PASS: GET /api/v1/blog/:slug returned HTTP 200 with matching title:", slugJson.data.title);

  console.log("\n--- 3. Testing Admin Blog CRUD API Endpoints ---");
  // Find admin user for token
  const admin = await User.findOne({ email: "admin@divyamayurveda.demo" });
  if (!admin) {
    console.log("Warning: No admin user found in DB to test admin auth endpoints. Skipping auth portion.");
  } else {
    const accessToken = generateAccessToken({ sub: admin._id, id: admin._id, email: admin.email, role: "Super Admin", isStaff: true });
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // List admin blog posts
    const adminListRes = await fetch(`${baseUrl}/admin/blog`, { headers: authHeaders });
    const adminListJson = await adminListRes.json();
    if (!adminListJson.success || !Array.isArray(adminListJson.data)) {
      throw new Error("FAIL: GET /api/v1/admin/blog failed!");
    }
    console.log(`PASS: GET /api/v1/admin/blog returned HTTP 200 with ${adminListJson.data.length} posts`);

    // Create a new post via Admin API
    const testPostData = {
      title: "Automated Test Article for Verification",
      slug: "automated-test-article-verification",
      category: "Ayurvedic Lifestyle",
      author: "Test Vaidya",
      readTime: "3 min read",
      excerpt: "Test teaser excerpt.",
      content: "Complete test body content.",
      status: "published",
    };

    const createRes = await fetch(`${baseUrl}/admin/blog`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(testPostData),
    });
    const createJson = await createRes.json();
    if (!createJson.success || !createJson.data || !createJson.data.id) {
      throw new Error(`FAIL: POST /api/v1/admin/blog failed: ${JSON.stringify(createJson)}`);
    }
    const createdId = createJson.data.id;
    console.log("PASS: POST /api/v1/admin/blog created post with ID:", createdId);

    // Update the post via Admin API
    const updateRes = await fetch(`${baseUrl}/admin/blog/${createdId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ title: "Updated Automated Test Article" }),
    });
    const updateJson = await updateRes.json();
    if (!updateJson.success || updateJson.data.title !== "Updated Automated Test Article") {
      throw new Error("FAIL: PATCH /api/v1/admin/blog/:id failed!");
    }
    console.log("PASS: PATCH /api/v1/admin/blog/:id updated post title successfully");

    // Delete the post via Admin API
    const deleteRes = await fetch(`${baseUrl}/admin/blog/${createdId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const deleteJson = await deleteRes.json();
    if (!deleteJson.success) {
      throw new Error("FAIL: DELETE /api/v1/admin/blog/:id failed!");
    }
    console.log("PASS: DELETE /api/v1/admin/blog/:id cleaned up test article successfully");
  }

  console.log("\n==========================================");
  console.log("ALL BLOG AUDIT & VERIFICATION CHECKS PASSED!");
  console.log("==========================================");
  process.exit(0);
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
