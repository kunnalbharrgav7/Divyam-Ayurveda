import { HomepageConfig } from "../models/HomepageConfig.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { BlogPost } from "../models/BlogPost.js";
import { Faq } from "../models/Faq.js";
import { Testimonial } from "../models/Testimonial.js";
import { ContactEnquiry } from "../models/ContactEnquiry.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { Subscriber } from "../models/Subscriber.js";
import { ApiError } from "../utils/apiError.js";

export class ContentService {
  async getHomepageConfig() {
    let config = await HomepageConfig.findOne();
    if (!config) {
      config = await HomepageConfig.create({});
    }
    return config.toJSON();
  }

  async getPublicStoreSettings() {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({});
    }
    const json = settings.toJSON();
    // Return only public elements (strip sensitive credentials/alerts)
    return {
      general: json.general,
      store: {
        enableCashOnDelivery: json.store?.enableCashOnDelivery,
        maxCodLimit: json.store?.maxCodLimit,
        enableGuestCheckout: json.store?.enableGuestCheckout,
      },
      shipping: json.shipping,
      tax: {
        originState: json.tax?.originState,
        taxIncludedInPrice: json.tax?.taxIncludedInPrice,
        standardGstRate: json.tax?.standardGstRate,
      },
      appearance: json.appearance,
    };
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

  async submitContact(data) {
    const enquiry = await ContactEnquiry.create({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || "",
      subject: data.subject || "Storefront Contact Inquiry",
      message: data.message,
    });
    return enquiry.toJSON();
  }

  async submitSupportTicket(data, user = null) {
    const count = await SupportTicket.countDocuments();
    const ticketNumber = `TKT-${Date.now().toString().slice(-4)}-${count + 1}`;

    const ticket = await SupportTicket.create({
      ticketNumber,
      userId: user?._id || null,
      customerName: data.name || user?.name || "Customer",
      customerEmail: (data.email || user?.email || "").toLowerCase(),
      customerPhone: data.phone || user?.phone || "",
      orderNumber: data.orderNumber || "",
      subject: data.subject,
      category: data.category || "General",
      priority: data.priority || "Normal",
      messages: [
        {
          sender: data.name || user?.name || "Customer",
          senderRole: "customer",
          message: data.message,
          time: new Date(),
        },
      ],
    });

    return ticket.toJSON();
  }

  async subscribeNewsletter(email) {
    if (!email || !email.includes("@")) {
      throw ApiError.badRequest("Please provide a valid email address.");
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await Subscriber.findOne({ email: cleanEmail });
    if (existing) {
      if (existing.status === "unsubscribed") {
        existing.status = "subscribed";
        await existing.save();
      }
      return { message: "Thank you for subscribing to Divyam Ayurveda newsletter." };
    }

    await Subscriber.create({ email: cleanEmail });
    return { message: "Thank you for subscribing to Divyam Ayurveda newsletter." };
  }
}

export const contentService = new ContentService();

