import { HomepageConfig } from "../models/HomepageConfig.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { BlogPost } from "../models/BlogPost.js";
import { Faq } from "../models/Faq.js";
import { Testimonial } from "../models/Testimonial.js";
import { ContactEnquiry } from "../models/ContactEnquiry.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { Order } from "../models/Order.js";
import { generateSecureToken } from "../utils/crypto.js";
import { ApiError } from "../utils/apiError.js";
import { settingsService } from "./settings.service.js";
import { ContentPage } from "../models/ContentPage.js";
import { CONTENT_PAGE_DEFAULTS, POLICY_SLUGS } from "../constants/contentPageDefaults.js";

const clean = (value, max) => String(value ?? "").trim().slice(0, max);

// Keeps only the fields the pages render, with sane limits, so a malformed request can't store junk
const sanitizeSections = (sections) => {
  if (!Array.isArray(sections)) throw ApiError.badRequest("Sections must be a list.");
  if (sections.length > 40) throw ApiError.badRequest("A page can have at most 40 sections.");
  return sections.map((section, index) => {
    const heading = clean(section?.heading, 200);
    if (!heading) throw ApiError.badRequest(`Section ${index + 1} needs a heading.`);
    const cards = Array.isArray(section?.cards) ? section.cards.slice(0, 12) : [];
    return {
      heading,
      body: String(section?.body ?? "").slice(0, 20000),
      cards: cards
        .map((card) => ({ title: clean(card?.title, 120), text: String(card?.text ?? "").slice(0, 2000) }))
        .filter((card) => card.title || card.text),
    };
  });
};

export class ContentService {
  /** Creates any missing policy page from the built-in defaults, so the storefront and admin always have content. */
  async ensurePolicyPages() {
    const existing = await ContentPage.find({ slug: { $in: POLICY_SLUGS } }).select("slug");
    const have = new Set(existing.map((page) => page.slug));
    for (const slug of POLICY_SLUGS) {
      if (!have.has(slug)) {
        await ContentPage.updateOne(
          { slug },
          { $setOnInsert: { slug, status: "published", ...CONTENT_PAGE_DEFAULTS[slug] } },
          { upsert: true }
        );
      }
    }
  }

  async getContentPage(slug) {
    if (!POLICY_SLUGS.includes(slug)) throw ApiError.notFound("Page not found");
    await this.ensurePolicyPages();
    const page = await ContentPage.findOne({ slug, status: "published" });
    if (!page) throw ApiError.notFound("Page not found");
    return page;
  }

  async listContentPages() {
    await this.ensurePolicyPages();
    const pages = await ContentPage.find({ slug: { $in: POLICY_SLUGS } });
    return POLICY_SLUGS.map((slug) => pages.find((page) => page.slug === slug)).filter(Boolean);
  }

  async saveContentPage(slug, body = {}) {
    if (!POLICY_SLUGS.includes(slug)) throw ApiError.notFound("Page not found");
    await this.ensurePolicyPages();
    const title = clean(body.title, 200);
    if (!title) throw ApiError.badRequest("The page title is required.");
    const update = {
      title,
      eyebrow: clean(body.eyebrow, 120),
      updatedLabel: clean(body.updatedLabel, 120),
      sections: sanitizeSections(body.sections),
    };
    return ContentPage.findOneAndUpdate({ slug }, update, { new: true, runValidators: true });
  }

  async getHomepageConfig() {
    let config = await HomepageConfig.findOne();
    if (!config) {
      config = await HomepageConfig.create({});
    }
    return config.toJSON();
  }

  async getPublicStoreSettings() {
    return settingsService.getPublic();
  }

  async getBlogPosts() {
    return BlogPost.find({ status: { $in: ["published", "Published"] } }).sort({ publishedAt: -1, createdAt: -1 });
  }

  async getBlogPostBySlug(slug) {
    if (!slug) throw ApiError.badRequest("Slug is required.");
    const post = await BlogPost.findOne({
      slug: slug.toLowerCase(),
      status: { $in: ["published", "Published"] },
    });
    if (!post) throw ApiError.notFound("Blog post not found.");
    return post;
  }

  async listAdminBlogPosts() {
    return BlogPost.find().sort({ publishedAt: -1, createdAt: -1 });
  }

  async getAdminBlogPost(id) {
    const post = await BlogPost.findById(id);
    if (!post) throw ApiError.notFound("Blog post not found.");
    return post;
  }

  async createBlogPost(data, user = null) {
    let slug = data.slug;
    if (!slug || !slug.trim()) {
      slug = (data.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    } else {
      slug = slug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }
    if (!slug) {
      slug = `article-${Date.now()}`;
    }

    // Check if slug is taken
    const existing = await BlogPost.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const post = await BlogPost.create({
      title: (data.title || "").trim(),
      slug,
      excerpt: (data.excerpt || "").trim(),
      content: (data.content || "").trim(),
      image: data.image || "/images/ProductImages/Himalya.png",
      author: data.author || "Dr. Ananya Sharma (BAMS, MD)",
      category: data.category || "Ayurvedic Lifestyle",
      readTime: data.readTime || "5 min read",
      tags: Array.isArray(data.tags) ? data.tags : [],
      status: (data.status || "published").toLowerCase(),
      publishedAt: data.date ? new Date(data.date) : (data.publishedAt ? new Date(data.publishedAt) : new Date()),
    });
    return post;
  }

  async updateBlogPost(id, data, user = null) {
    const post = await BlogPost.findById(id);
    if (!post) throw ApiError.notFound("Blog post not found.");

    if (data.title !== undefined) post.title = data.title.trim();
    if (data.slug !== undefined && data.slug.trim()) {
      const cleanSlug = data.slug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      if (cleanSlug && cleanSlug !== post.slug) {
        const existing = await BlogPost.findOne({ slug: cleanSlug, _id: { $ne: post._id } });
        if (existing) {
          throw ApiError.conflict("An article with this URL slug already exists.");
        }
        post.slug = cleanSlug;
      }
    }
    if (data.excerpt !== undefined) post.excerpt = data.excerpt.trim();
    if (data.content !== undefined) post.content = data.content;
    if (data.image !== undefined) post.image = data.image;
    if (data.author !== undefined) post.author = data.author;
    if (data.category !== undefined) post.category = data.category;
    if (data.readTime !== undefined) post.readTime = data.readTime;
    if (data.tags !== undefined) post.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.status !== undefined) post.status = data.status.toLowerCase();
    if (data.date) post.publishedAt = new Date(data.date);
    else if (data.publishedAt) post.publishedAt = new Date(data.publishedAt);

    await post.save();
    return post;
  }

  async deleteBlogPost(id, user = null) {
    const post = await BlogPost.findByIdAndDelete(id);
    if (!post) throw ApiError.notFound("Blog post not found.");
    return { id, message: "Blog post deleted successfully." };
  }

  async getFaqs() {
    return Faq.find({ isActive: true }).sort({ displayOrder: 1 });
  }

  async getTestimonials() {
    return Testimonial.find({ isActive: true }).sort({ displayOrder: 1 });
  }

  async submitContact(data, user = null) {
    const enquiry = await ContactEnquiry.create({
      name: clean(data.name, 100),
      email: String(data.email).trim().toLowerCase(),
      phone: clean(data.phone, 20),
      subject: clean(data.subject, 150) || "General enquiry",
      message: clean(data.message, 2000),
      userId: user?._id || null,
    });
    // The sender only needs to know it arrived; internal notes and staff replies stay private
    return { id: enquiry.id, status: enquiry.status, createdAt: enquiry.createdAt };
  }

  /**
   * The Contact Us messages a signed-in customer sent, with the team's replies. Only messages linked to their account
   * (sent while signed in) are shown: an email typed into the form proves nothing about who owns it. Internal notes
   * are never included.
   */
  async listMyEnquiries(user) {
    const enquiries = await ContactEnquiry.find({ userId: user._id }).sort({ createdAt: -1 });
    return enquiries.map((e) => {
      const json = e.toJSON();
      return {
        id: json.id,
        subject: json.subject,
        message: json.message,
        status: json.status,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
        replies: (json.replies || []).map((r) => ({ message: r.message, staffName: r.staffName, time: r.time })),
      };
    });
  }

  // ---------------------------------------------------------------- support tickets (signed-in customers)

  /** What a customer may see of their own ticket: never the staff's internal notes */
  #toCustomerTicket(ticket) {
    const json = ticket.toJSON();
    return {
      id: json.id,
      ticketNumber: json.ticketNumber,
      subject: json.subject,
      category: json.category,
      orderNumber: json.orderNumber || "",
      status: json.status,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      messages: (json.messages || []).map((m) => ({
        sender: m.sender,
        senderRole: m.senderRole === "customer" ? "customer" : "staff",
        message: m.message,
        time: m.time,
      })),
    };
  }

  async #newTicketNumber() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const d = new Date();
      const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
      const number = `TKT-${ymd}-${parseInt(generateSecureToken(3), 16) % 900000 + 100000}`;
      if (!(await SupportTicket.exists({ ticketNumber: number }))) return number;
    }
    throw ApiError.internal("Could not create a ticket number. Please try again.");
  }

  async createTicket(user, data) {
    const orderNumber = clean(data.orderNumber, 40);
    if (orderNumber) {
      const order = await Order.findOne({ orderNumber }).select("userId customer.email").lean();
      const owns =
        order &&
        ((order.userId && String(order.userId) === String(user._id)) ||
          (order.customer?.email && order.customer.email.toLowerCase() === String(user.email).toLowerCase()));
      if (!owns) throw ApiError.badRequest("That order isn't on your account. Choose one of your own orders, or leave it blank.");
    }

    const ticket = await SupportTicket.create({
      ticketNumber: await this.#newTicketNumber(),
      userId: user._id,
      customerName: user.name || "Customer",
      customerEmail: String(user.email).toLowerCase(),
      customerPhone: user.phone || "",
      orderNumber,
      subject: clean(data.subject, 150),
      category: data.category || "Other",
      priority: "Normal",
      messages: [{ sender: user.name || "Customer", senderRole: "customer", message: clean(data.message, 2000), time: new Date() }],
    });
    return this.#toCustomerTicket(ticket);
  }

  async listMyTickets(user) {
    const tickets = await SupportTicket.find({ userId: user._id }).sort({ updatedAt: -1 });
    return tickets.map((t) => this.#toCustomerTicket(t));
  }

  async getMyTicket(user, ticketNumber) {
    // Someone else's ticket looks exactly like one that does not exist
    const ticket = await SupportTicket.findOne({ ticketNumber: String(ticketNumber), userId: user._id });
    if (!ticket) throw ApiError.notFound("Ticket not found.");
    return this.#toCustomerTicket(ticket);
  }

  async addMyTicketMessage(user, ticketNumber, message) {
    const ticket = await SupportTicket.findOne({ ticketNumber: String(ticketNumber), userId: user._id });
    if (!ticket) throw ApiError.notFound("Ticket not found.");
    if (ticket.status === "Closed") {
      throw ApiError.conflict("This ticket is closed. Please open a new ticket if you still need help.");
    }
    ticket.messages.push({ sender: user.name || "Customer", senderRole: "customer", message: clean(message, 2000), time: new Date() });
    // Writing back on a resolved ticket reopens it so the team sees it again
    if (ticket.status === "Resolved") ticket.status = "Open";
    await ticket.save();
    return this.#toCustomerTicket(ticket);
  }
}

export const contentService = new ContentService();

