import { connectDB } from "../src/db/connection.js";
import { BlogPost } from "../src/models/BlogPost.js";
import { invalidateCache } from "../src/middleware/cache.js";

async function main() {
  await connectDB();

  const userArticle = {
    title: "5 Morning Dinacharya Rituals for a Healthier Lifestyle",
    slug: "5-morning-dinacharya-rituals-for-a-healthier-lifestyle",
    category: "Ayurvedic Lifestyle",
    author: "Dr. Ananya Sharma (BAMS, MD)",
    readTime: "5 min read",
    excerpt:
      "Discover five simple Ayurvedic morning practices that can help you build a mindful daily routine, support everyday well-being, and bring your doshas into natural balance.",
    content: `### 1. Brahma Muhurta: The Ambience of Stillness
Awakening approximately 45 minutes before sunrise aligns your circadian biology with nature's purest energetic wave (Sattva). This tranquil morning window provides serene mental clarity and emotional grounding before the demands of the day begin.

### 2. Ushapan: Awakening the Digestive Fire (Agni)
Begin your morning by drinking one to two glasses of warm or room-temperature water, ideally stored overnight in a traditional copper vessel (Tamra Jal). This rehydrates tissues, gently activates peristalsis, and promotes natural, effortless elimination of metabolic wastes.

### 3. Jihwa Prakshalana: Tongue Cleansing & Oral Hygiene
Gently scrape your tongue 5 to 7 times from back to front using a pure copper or stainless steel tongue scraper. This classical ritual clears toxic coatings (Ama) that deposit on the tongue overnight, awakens the salivary glands, and sharpens digestive discernment.

### 4. Gandusha: Botanical Oil Pulling
Swish one tablespoon of warm wood-pressed sesame or coconut oil throughout your mouth for 3 to 5 minutes before spitting it out. Gandusha fortifies tooth enamel, strengthens gums, balances oral microbes, and draws lipid-soluble residues from the oral cavity.

### 5. Abhyanga & Pranayama: Mindful Grounding
Apply warm herbal oil in long strokes over your limbs and circular motions over joints (Abhyanga) before a warm bath, followed by 5 to 10 minutes of slow Nadi Shodhana (Alternate Nostril Breathing). This harmonizes elevated Vata dosha, nurtures skin luster, and readies you to meet the day with calm vitality.`,
    image: "/images/ProductImages/Himalya.png",
    tags: ["Dinacharya", "Ayurvedic Lifestyle", "Morning Rituals", "Wellness", "Daily Routine"],
    status: "published",
    publishedAt: new Date(),
  };

  const educationalArticles = [
    {
      title: "Understanding the Three Doshas: Living in Harmony with Nature",
      slug: "understanding-the-three-doshas-vata-pitta-kapha",
      excerpt:
        "Discover the fundamentals of Vata, Pitta, and Kapha, and how your unique constitution (Prakriti) guides everyday dietary and herbal choices.",
      category: "Ayurvedic Traditions",
      readTime: "5 min read",
      author: "Vaidya R. Sharma, BAMS",
      image: "/images/ProductImages/Himalya.png",
      tags: ["Doshas", "Prakriti", "Foundations", "Holistic Health"],
      content: `### The Foundation of Ayurvedic Wisdom
Ayurveda views each human being as an indivisible part of the cosmos. According to classical philosophy, the manifest universe is constituted of five fundamental elements: Ether, Air, Fire, Water, and Earth.

In the living body, these elements combine into three primary energies known as the **Tridoshas**:
- **Vata (Ether + Air):** Governs movement, respiration, nerve impulses, and circulation.
- **Pitta (Fire + Water):** Governs metabolism, digestion (Agni), enzyme transformation, and intellect.
- **Kapha (Water + Earth):** Governs structural integrity, lubrication, joint cohesion, and emotional resilience.

### Finding Your Balance in Daily Living
When the three doshas remain balanced (Samatva), vibrant wellness and clarity prevail. Simple daily practices such as warm seasonal meals, regular sleep cycles, and authentic botanical formulations help nourish vitality and equilibrium.`,
      status: "published",
      publishedAt: new Date(Date.now() - 86400000),
    },
    {
      title: "Churna, Tailam, Swaras & Asava: A Guide to Ayurvedic Product Forms",
      slug: "churna-tailam-asava-guide-to-ayurvedic-product-forms",
      excerpt:
        "Why are some herbs taken as pulverized powders while others are extracted into medicated oils or fermented elixirs? Here is what each preparation means.",
      category: "Herbal Product Forms",
      readTime: "7 min read",
      author: "Divyam Research Team",
      image: "/images/ProductImages/PureHimalayanShilajit3.jpeg",
      tags: ["Product Forms", "Churna", "Tailam", "Herbal Pharmacy"],
      content: `### The Science of Ayurvedic Formulation (Bhaishajya Kalpana)
In classical Ayurvedic pharmacy, botanicals are prepared according to precise pharmacopeial methods to extract bioactive nutrients effectively:

1. **Churna (Fine Herbal Powders):** Whole botanicals dried naturally and pulverized through microscopic sieves, preserving whole plant synergy.
2. **Tailam (Medicated Oils):** Botanicals infused through the multi-day *Taila Paka* process into pure wood-pressed sesame or coconut oil, providing deep cellular nourishment.
3. **Swaras (Fresh Expressed Juices):** The raw herbal sap extracted mechanically without heat, delivering bioavailable phytonutrients.
4. **Kwath & Kadha (Coarse Decoctions):** Botanicals boiled in water to concentrate dense tannins and bitter principles.
5. **Avaleha (Herbal Jams & Electuaries):** Highly concentrated herbal preserves formulated with ghee and raw honey, of which Chyawanprash is the foremost example.`,
      status: "published",
      publishedAt: new Date(Date.now() - 172800000),
    },
    {
      title: "How to Read an Ayurvedic Product Label with Confidence",
      slug: "how-to-read-an-ayurvedic-product-label-with-confidence",
      excerpt:
        "Learn how to spot authentic classical botanicals, distinguish standardized extracts from fillers, and verify genuine certifications on your herbal supplements.",
      category: "Consumer Education",
      readTime: "6 min read",
      author: "Pooja Deshmukh, Phytochemist",
      image: "/images/ProductImages/Ashuwaganda.png",
      tags: ["Label Reading", "Quality Standards", "Safety", "Certifications"],
      content: `### Decoding the Ingredients List
When selecting authentic Ayurvedic products, transparency is essential. High-integrity manufacturers provide clear, unabbreviated botanical information:

1. **Verify the Latin Botanical Name:** Genuine products state the formal species name (e.g. *Withania somnifera* alongside Ashwagandha) to prevent adulteration.
2. **Inspect the Anatomical Plant Part:** Classical efficacy depends on using the proper anatomical plant part (such as *Rhizome*, *Root Bark*, or *Whole Fruit*).
3. **Look for Standardized Purity:** Reputable formulations detail active compound concentrations and zero heavy-metal adulteration.
4. **Regulatory Certifications:** Check for Ayush licensing, FSSAI registration, and GMP certifications on the label.`,
      status: "published",
      publishedAt: new Date(Date.now() - 259200000),
    },
  ];

  const allPosts = [userArticle, ...educationalArticles];

  for (const post of allPosts) {
    const existing = await BlogPost.findOne({ slug: post.slug });
    if (!existing) {
      await BlogPost.create(post);
      console.log(`Created blog post: ${post.title}`);
    } else {
      await BlogPost.updateOne({ _id: existing._id }, { $set: post });
      console.log(`Updated blog post: ${post.title}`);
    }
  }

  await invalidateCache("content");
  console.log("Total blog posts in DB now:", await BlogPost.countDocuments());
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

