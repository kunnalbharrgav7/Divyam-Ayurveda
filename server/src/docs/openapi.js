export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Divyam Ayurveda REST API",
    version: "1.0.0",
    description:
      "Production-grade e-commerce REST API for Divyam Ayurveda Indian herbal products storefront and administrative management.",
    contact: {
      name: "Divyam Ayurveda Engineering",
      email: "care@divyamayurveda.com",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Default API v1 Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Bearer token authentication.",
      },
      IdempotencyHeader: {
        type: "apiKey",
        in: "header",
        name: "Idempotency-Key",
        description: "Unique UUID or transaction token to ensure mutation idempotency.",
      },
    },
    schemas: {
      StandardResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 12 },
              total: { type: "integer", example: 28 },
              totalPages: { type: "integer", example: 3 },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "BAD_REQUEST" },
              message: { type: "string", example: "Validation failed" },
              details: { type: "object", nullable: true },
              requestId: { type: "string", example: "uuid-v4-request-id" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/products": {
      get: {
        summary: "List filtered products with facets, search and pagination",
        tags: ["Catalog"],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Full-text search query" },
          { name: "category", in: "query", schema: { type: "string" }, description: "Category slug filter" },
          { name: "minPrice", in: "query", schema: { type: "number" }, description: "Minimum price in INR" },
          { name: "maxPrice", in: "query", schema: { type: "number" }, description: "Maximum price in INR" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["featured", "newest", "price_asc", "price_desc", "rating", "popularity"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 12 } },
        ],
        responses: {
          "200": { description: "Filtered products response", content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } } },
        },
      },
    },
    "/products/{slug}": {
      get: {
        summary: "Retrieve product details by unique slug",
        tags: ["Catalog"],
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Product detail with active variants and reviews" },
          "404": { description: "Product not found" },
        },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register new customer account",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Kunal Sharma" },
                  email: { type: "string", example: "kunal@example.test" },
                  phone: { type: "string", example: "9876543210" },
                  password: { type: "string", example: "StrongPass!123" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Customer registered successfully with access and refresh tokens" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Customer login",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "kunal@example.test" },
                  password: { type: "string", example: "StrongPass!123" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/staff/login": {
      post: {
        summary: "Staff administrative authentication",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "admin@divyamayurveda.demo" },
                  password: { type: "string", example: "DivyamAdmin!2026" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Staff login successful" },
          "403": { description: "Not a staff account" },
        },
      },
    },
    "/checkout/quote": {
      post: {
        summary: "Calculate server-authoritative checkout quote with stock verification, discounts, tax and shipping",
        tags: ["Checkout"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items", "address"],
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["variantId", "quantity"],
                      properties: {
                        variantId: { type: "string" },
                        quantity: { type: "integer", minimum: 1 },
                      },
                    },
                  },
                  address: {
                    type: "object",
                    required: ["fullName", "phone", "line1", "city", "state", "pincode"],
                    properties: {
                      fullName: { type: "string" },
                      phone: { type: "string" },
                      line1: { type: "string" },
                      city: { type: "string" },
                      state: { type: "string" },
                      pincode: { type: "string" },
                    },
                  },
                  deliveryMethod: { type: "string", enum: ["standard", "express"] },
                  couponCode: { type: "string" },
                  referralCode: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Quote generated with fingerprint and pricing breakdown" },
        },
      },
    },
    "/orders": {
      post: {
        summary: "Place order using server-calculated quote fingerprint (Idempotent)",
        tags: ["Orders"],
        security: [{ BearerAuth: [] }, { IdempotencyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quoteId"],
                properties: {
                  quoteId: { type: "string" },
                  paymentMethod: { type: "string", enum: ["cod", "cashfree"] },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Order created successfully" },
        },
      },
    },
    "/payments/cashfree/session": {
      post: {
        summary: "Create Cashfree PG payment session for quote",
        tags: ["Payments"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quoteId"],
                properties: {
                  quoteId: { type: "string" },
                  returnUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Payment session created with paymentSessionId" },
        },
      },
    },
    "/orders/track": {
      get: {
        summary: "Secure guest order tracking requiring orderNumber and email",
        tags: ["Orders"],
        parameters: [
          { name: "orderNumber", in: "query", required: true, schema: { type: "string" } },
          { name: "email", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Order tracking and delivery status" },
        },
      },
    },
    "/admin/dashboard": {
      get: {
        summary: "Admin dashboard KPIs and sales metrics",
        tags: ["Admin"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Aggregated metrics" },
          "403": { description: "Forbidden" },
        },
      },
    },
  },
};

