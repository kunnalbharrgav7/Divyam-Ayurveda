/**
 * Default text for the storefront policy pages. Used to create a page the first time it is
 * requested; after that the copy lives in the database and is edited from Admin → Content Pages.
 * Body text: blank line = new paragraph, single newline = line break, **word** = bold.
 */
export const POLICY_SLUGS = ["privacy", "terms", "shipping", "returns"];

export const CONTENT_PAGE_DEFAULTS = {
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Data Protection & Integrity",
    updatedLabel: "Effective Date: January 1, 2026",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "Divyam Ayurveda collects essential customer contact details (name, email address, delivery street address, phone number) exclusively for order delivery, SMS shipment alerts, and opt-in Ayurvedic newsletter updates.",
      },
      {
        heading: "2. Payment Security",
        body: "We do not store complete credit card numbers, CVVs, or NetBanking credentials on our servers. All digital transactions are processed through encrypted, RBI-compliant payment gateway partners.",
      },
      {
        heading: "3. Zero Third-Party Data Selling",
        body: "We never sell, rent, or trade your personal wellness information or browsing history to third-party ad networks or brokers.",
      },
      {
        heading: "4. Cookies & Local Persistence",
        body: "We use secure local storage and essential session cookies strictly to preserve your cart contents, wishlist preferences, and account session states across browsing sessions.",
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    eyebrow: "Legal Terms of Service",
    updatedLabel: "Last updated: January 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By browsing, accessing, or placing orders through the Divyam Ayurveda website, you agree to comply with and be bound by these Terms and Conditions and our Privacy Policy.",
      },
      {
        heading: "2. Ayurvedic Wellness Disclaimer",
        body: "The herbal products, classical churnas, and dietary formulations displayed on this website are based on traditional Ayurvedic texts and intended to support general well-being. Content provided on this website is for educational purposes and is not a substitute for professional clinical medical advice, diagnosis, or treatment.",
      },
      {
        heading: "3. Pricing & Formulation Availability",
        body: "All prices are declared in Indian Rupees (INR) and are inclusive of GST. We reserve the right to revise product specifications, pack sizes, and prices based on seasonal botanical harvest yields without prior notice.",
      },
      {
        heading: "4. Intellectual Property",
        body: "All trademarks, trade dress, product nomenclature, classical formulation write-ups, and imagery displayed on Divyam Ayurveda are the intellectual property of Divyam Ayurveda.",
      },
    ],
  },
  shipping: {
    title: "Shipping & Delivery Policy",
    eyebrow: "Logistics & Dispensary Dispatch",
    updatedLabel: "Last updated: January 2026",
    sections: [
      {
        heading: "1. Order Processing Timelines",
        body: "All Divyam Ayurveda formulations are fresh-pulverized and batch-checked prior to packing. Orders placed before 1:00 PM IST on business days are dispatched within 24 to 48 hours from our central Ayurvedic dispensary.",
      },
      {
        heading: "2. Shipping Rates & Free Delivery",
        body: "- **Free Shipping:** Automatically applied to all prepaid and COD orders exceeding **₹499** across serviceable pin codes in India.\n- **Standard Shipping Fee:** A nominal charge of **₹49** is applied to orders below ₹499 to cover temperature-neutral protective packaging.",
      },
      {
        heading: "3. Estimated Delivery Duration",
        body: "",
        cards: [
          {
            title: "Metro Cities",
            text: "Bengaluru, Mumbai, Delhi NCR, Chennai, Hyderabad, Kolkata: **2 to 4 business days**.",
          },
          {
            title: "Rest of India",
            text: "Tier-2, Tier-3 cities and regional townships: **4 to 7 business days**.",
          },
        ],
      },
      {
        heading: "4. Cash on Delivery (COD) Rules",
        body: "Cash on delivery is available for orders up to ₹5,000. Please ensure someone is present at the delivery address with exact cash or mobile UPI payment enabled.",
      },
    ],
  },
  returns: {
    title: "Returns, Exchanges & Refunds",
    eyebrow: "Customer Assurance",
    updatedLabel: "Last updated: January 2026",
    sections: [
      {
        heading: "1. 7-Day Return Window",
        body: "Because our formulations contain active botanicals and edible extracts, opened or used products cannot be returned for a change of mind. You can return a delivered order within **7 days** of delivery if it arrived damaged, with a broken seal, wrong or missing items, near expiry, not as described, or if you had a reaction to it. Unopened products ordered by mistake can also be returned. Returns are for the **whole order**, not individual items.",
      },
      {
        heading: "2. How to Request a Return",
        body: "Sign in, open **My Account → My Orders** and press **Return / Refund** on the delivered order. Choose a reason, add photos where asked, and tell us how you want your refund. You can follow every step under **My Account → Returns & Refunds**. We review requests within 24 hours.",
      },
      {
        heading: "3. Refund Processing",
        body: "After the returned parcel is received and checked, orders paid online are refunded to the original payment method (UPI / Card / NetBanking), usually within 3 to 7 business days. For Cash on Delivery orders you choose between a bank transfer, UPI, or instant store credit that you can use on your next order.",
      },
    ],
  },
};
