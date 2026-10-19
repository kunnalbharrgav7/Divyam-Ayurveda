/**
 * Centralized Product Catalog for Divyam Ayurveda
 * 28 realistic, authentic Ayurvedic products across all key categories.
 * Powers Best Sellers, Trending, New Arrivals, Catalog, Search, and Cart.
 */

export const products = [
  // 1. BEST SELLERS / REFERENCE SCREENSHOT PRODUCTS
  {
    id: "prod-001",
    slug: "organic-turmeric-powder-lakadong",
    name: "Organic Turmeric Powder",
    brand: "Divyam Ayurveda",
    categoryId: "churna-powders",
    subcategoryId: "nutrition-powders",
    subcategory: "Nutritional & Detox Powders",
    shortDescription: "High-curcumin Lakadong turmeric ground with natural essential oils preserved.",
    description: "Our Organic Turmeric Powder is sourced from the pristine hills of Meghalaya. Naturally boasting an exceptional 7-8% curcumin level, it is sun-dried and traditionally pulverized without chemical treatment. Ideal for golden milk, classical herbal preparations, and daily culinary nourishment.",
    price: 249,
    originalPrice: 349,
    images: [
      "/images/ProductImages/PureHimalayanShilajit2.jpeg",
      "/images/ProductImages/Ashuwaganda.png"
    ],
    packSize: "250g",
    productForm: "Powder / Churna",
    ingredients: ["100% Pure Organic Lakadong Turmeric (Curcuma longa) Rhizome Powder"],
    stockQuantity: 85,
    rating: 4.9,
    reviewCount: 1245,
    tags: ["Immunity", "Anti-inflammatory", "Certified Organic", "Bestseller"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: true,
    isNew: false,
    createdAt: "2025-08-15T00:00:00Z",
    variants: [
      { size: "250g", price: 249, originalPrice: 349 },
      { size: "500g", price: 449, originalPrice: 620 },
      { size: "1kg", price: 799, originalPrice: 1100 }
    ],
    productInformation: {
      storage: "Store in a cool, dry place away from direct sunlight and moisture.",
      certifications: ["FSSAI Certified", "Jaivik Bharat Organic", "GMP Certified"],
      origin: "Jaintia Hills, Meghalaya, India",
      shelfLife: "24 Months from packaging"
    },
    warnings: "This is a natural food supplement. Consult an Ayurvedic doctor if pregnant or nursing."
  },
  {
    id: "prod-002",
    slug: "pure-wild-forest-honey",
    name: "Pure Wild Forest Honey",
    brand: "Divyam Ayurveda",
    categoryId: "wellness-essentials",
    subcategoryId: "wild-honey",
    subcategory: "Raw Forest Honey",
    shortDescription: "Raw, unheated, single-origin multi-flora forest nectar collected sustainably.",
    description: "Harvested ethically by indigenous forest communities from wild comb nests in the Satpura reserves. Unpasteurized and unfiltered to preserve delicate bee pollen, live enzymes, and medicinal aromatic compounds celebrated in classical Charaka Samhita as the premier Yogavahi anupana.",
    price: 389,
    originalPrice: 499,
    images: [
      "/images/ProductImages/PureHimalayanShilajit.jpeg",
      "/images/ProductImages/PureHimalayanShilajit3.jpeg"
    ],
    packSize: "500g",
    productForm: "Liquid / Raw Nectar",
    ingredients: ["100% Raw Wild Forest Honey (Apis dorsata comb nectar)"],
    stockQuantity: 42,
    rating: 4.8,
    reviewCount: 882,
    tags: ["Immunity", "Raw Honey", "Digestive", "Bestseller"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: false,
    isNew: false,
    createdAt: "2025-09-01T00:00:00Z",
    variants: [
      { size: "500g", price: 389, originalPrice: 499 },
      { size: "1kg", price: 699, originalPrice: 899 }
    ],
    productInformation: {
      storage: "Store at ambient room temperature. Do not refrigerate or heat above 40°C.",
      certifications: ["Agmark Special Grade", "Non-GMO Tested", "GMP Certified"],
      origin: "Satpura Tiger Reserve Biosphere, MP, India",
      shelfLife: "18 Months from packaging"
    },
    warnings: "Not recommended for infants below 12 months."
  },
  {
    id: "prod-003",
    slug: "organic-ashwagandha-capsules",
    name: "Organic Ashwagandha Extract",
    brand: "Divyam Ayurveda",
    categoryId: "ayurvedic-herbs",
    subcategoryId: "vitality-adaptogens",
    subcategory: "Vitality & Adaptogens",
    shortDescription: "Standardized KSM-66 root extract for stress resilience, energy, and hormonal vitality.",
    description: "Crafted strictly from whole wild-crafted Ashwagandha (Withania somnifera) roots without leaves or aerial parts. Standardized to 5% withanolides through full-spectrum water-milk extraction. Supports calm sleep, sustained vigor, and mental balance under stressful modern routines.",
    price: 499,
    originalPrice: 650,
    images: [
      "/images/ProductImages/Ashuwaganda.png",
      "/images/ProductImages/Shilajit.png"
    ],
    packSize: "60 Capsules",
    productForm: "Vegetarian Capsules",
    ingredients: ["Organic Ashwagandha (Withania somnifera) Root Extract 500mg (5% Withanolides)", "Plant Cellulose Capsule"],
    stockQuantity: 110,
    rating: 4.9,
    reviewCount: 764,
    tags: ["Stress Relief", "Adaptogen", "Sleep", "Bestseller"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: true,
    isNew: false,
    createdAt: "2025-07-20T00:00:00Z",
    variants: [
      { size: "60 Capsules", price: 499, originalPrice: 650 },
      { size: "120 Capsules", price: 899, originalPrice: 1200 }
    ],
    productInformation: {
      storage: "Keep in a cool, dark container tightly sealed.",
      certifications: ["GMP Certified", "ISO 9001:2015", "Ayush Premium Mark"],
      origin: "Madhya Pradesh, India",
      shelfLife: "36 Months"
    },
    warnings: "Take 1 capsule twice daily with warm milk or water, or as directed by an Ayurvedic physician."
  },
  {
    id: "prod-004",
    slug: "pure-aloe-vera-skin-gel",
    name: "Pure Aloe Vera Gel with Kesar",
    brand: "Divyam Ayurveda",
    categoryId: "personal-care",
    subcategoryId: "face-skin-care",
    subcategory: "Facial & Skin Care (Ubtan)",
    shortDescription: "99% pure cold-pressed inner-leaf gel infused with Kashmiri saffron strands.",
    description: "Extracted directly from organic Aloe barbadensis leaves within 4 hours of morning harvest. Free from green rind aloin, petroleum byproducts, artificial fragrances, or toxic thickeners. Deeply soothes sunburn, hydrates dry skin, and calms scalp irritation naturally.",
    price: 299,
    originalPrice: 399,
    images: [
      "/images/ProductImages/VitaminC.png",
      "/images/ProductImages/PureHimalayanShilajit.jpeg"
    ],
    packSize: "200ml",
    productForm: "Topical Gel",
    ingredients: ["Pure Aloe Vera (Aloe barbadensis) Leaf Juice 98.5%", "Kashmiri Kesar (Crocus sativus) Stigma Extract", "Natural Plant Cellulose Gum"],
    stockQuantity: 68,
    rating: 4.8,
    reviewCount: 1102,
    tags: ["Skin Care", "Hair Care", "Hydration", "Bestseller"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: false,
    isNew: false,
    createdAt: "2025-08-01T00:00:00Z",
    variants: [
      { size: "200ml", price: 299, originalPrice: 399 },
      { size: "400ml", price: 499, originalPrice: 699 }
    ],
    productInformation: {
      storage: "Store in a cool place away from radiant heat.",
      certifications: ["Dermatologically Tested", "Cruelty-Free", "Ayush Licensed"],
      origin: "Rajasthan, India",
      shelfLife: "24 Months"
    },
    warnings: "For external use only. Patch test behind the ear prior to initial use."
  },
  {
    id: "prod-005",
    slug: "tulsi-ginger-green-tea",
    name: "Organic Tulsi Green Tea",
    brand: "Divyam Ayurveda",
    categoryId: "kadha-herbal-teas",
    subcategoryId: "immunity-kadha",
    subcategory: "Immunity & Lung Care Kadha",
    shortDescription: "Blend of Rama, Krishna, and Vana Tulsi whole leaves with Himalayan Green Tea.",
    description: "A restorative tri-tulsi botanical infusion pairing high-altitude single-estate green tea with holy basil harvested at peak sunrise potency. Delivers subtle floral notes, natural antioxidants, and gentle metabolic warmth without caffeine jitters.",
    price: 269,
    originalPrice: 350,
    images: [
      "/images/ProductImages/Shilajit.png",
      "/images/ProductImages/PureHimalayanShilajit2.jpeg"
    ],
    packSize: "100g",
    productForm: "Loose Herbal Leaves",
    ingredients: ["Rama Tulsi (Ocimum sanctum)", "Krishna Tulsi (Ocimum tenuiflorum)", "Vana Tulsi (Ocimum gratissimum)", "Whole Leaf Kangra Green Tea (Camellia sinensis)"],
    stockQuantity: 94,
    rating: 4.7,
    reviewCount: 690,
    tags: ["Detox", "Antioxidants", "Caffeine-free Option", "Bestseller"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: false,
    isNew: false,
    createdAt: "2025-08-10T00:00:00Z",
    variants: [
      { size: "100g", price: 269, originalPrice: 350 },
      { size: "250g", price: 549, originalPrice: 750 }
    ],
    productInformation: {
      storage: "Keep in the airtight tin provided.",
      certifications: ["USDA Organic", "Rainforest Alliance", "FSSAI"],
      origin: "Kangra Valley & Bundelkhand, India",
      shelfLife: "24 Months"
    },
    warnings: "Infuse 1 tsp in 90°C water for 3-4 minutes. Do not boil directly."
  },

  // 2. DIGESTIVE & CHURNA SPECIALTIES
  {
    id: "prod-006",
    slug: "triphala-churna-classical",
    name: "Classical Triphala Churna",
    brand: "Divyam Ayurveda",
    categoryId: "churna-powders",
    subcategoryId: "digestive-churnas",
    subcategory: "Classical Digestive Churnas",
    shortDescription: "Equal proportion Haritaki, Bibhitaki, and Amalaki for gentle bowel harmony.",
    description: "An authentic polyherbal formulation prepared precisely according to Sharangadhara Samhita. We exclude the inner wood seed kernels and micro-grind only the rich fleshy fruit pericarps to deliver pure tridoshic balance, healthy colon cleansing, and natural ocular vitality.",
    price: 199,
    originalPrice: 280,
    images: [
      "/images/ProductImages/PureHimalayanShilajit3.jpeg",
      "/images/ProductImages/Ashuwaganda.png"
    ],
    packSize: "200g",
    productForm: "Powder / Churna",
    ingredients: ["Amalaki (Emblica officinalis) fruit rind 33.3%", "Haritaki (Terminalia chebula) fruit rind 33.3%", "Bibhitaki (Terminalia bellirica) fruit rind 33.3%"],
    stockQuantity: 120,
    rating: 4.8,
    reviewCount: 940,
    tags: ["Digestive", "Detox", "Tridoshic", "Bestseller"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: true,
    isNew: false,
    createdAt: "2025-06-12T00:00:00Z",
    variants: [
      { size: "200g", price: 199, originalPrice: 280 },
      { size: "500g", price: 399, originalPrice: 560 }
    ],
    productInformation: {
      storage: "Store dry away from humidity.",
      certifications: ["GMP Certified", "Ayush Licensed"],
      origin: "Vindhya Forests, MP, India",
      shelfLife: "24 Months"
    },
    warnings: "Consume 1 teaspoon at bedtime with lukewarm water."
  },
  {
    id: "prod-007",
    slug: "pure-amla-swaras-juice",
    name: "Pure Wild Amla Swaras Juice",
    brand: "Divyam Ayurveda",
    categoryId: "herbal-juices",
    subcategoryId: "daily-immunity-swaras",
    subcategory: "Daily Immunity Swaras",
    shortDescription: "Cold-pressed fresh Pratapgarh Indian Gooseberry juice with no added water.",
    description: "Traditional swaras prepared from fresh, wild small-variety Indian gooseberries renowned for highest natural Vitamin C concentration. Unlike diluted reconstituted market concentrates, Divyam Amla Juice contains zero artificial water addition, sugar, or synthetic ascorbic acid.",
    price: 299,
    originalPrice: 399,
    images: [
      "/images/ProductImages/Himalya.png",
      "/images/ProductImages/VitaminC.png"
    ],
    packSize: "500ml",
    productForm: "Liquid / Juice",
    ingredients: ["100% Pure Amla (Phyllanthus emblica) Fruit Juice", "Permitted Class II Preservative (0.1% Sodium Benzoate as per Ayush norm)"],
    stockQuantity: 75,
    rating: 4.8,
    reviewCount: 540,
    tags: ["Vitamin C", "Immunity", "Hair & Skin", "Trending"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: true,
    isNew: false,
    createdAt: "2025-09-10T00:00:00Z",
    variants: [
      { size: "500ml", price: 299, originalPrice: 399 },
      { size: "1 Litre", price: 520, originalPrice: 720 }
    ],
    productInformation: {
      storage: "Refrigerate after breaking seal and consume within 30 days.",
      certifications: ["FSSAI", "GMP Compliant"],
      origin: "Pratapgarh, UP, India",
      shelfLife: "12 Months"
    },
    warnings: "Dilute 20ml in a glass of room temperature water every morning on empty stomach."
  },
  {
    id: "prod-008",
    slug: "bhringraj-herbal-hair-tailam",
    name: "Maha Bhringraj Herbal Hair Oil",
    brand: "Divyam Ayurveda",
    categoryId: "herbal-oils",
    subcategoryId: "hair-scalp-tailams",
    subcategory: "Hair & Scalp Tailams",
    shortDescription: "Classical Taila Paka Siddhi boiled slowly with 16 botanicals in pure black sesame oil.",
    description: "Crafted through the intricate 72-hour Ayurvedic Taila Paka method. Wild Bhringraj juice, Amla, Brahmi, and Manjistha are slowly decocted into wood-pressed sesame oil. Deeply penetrates the scalp to strengthen hair roots, soothe excess Pitta heat, and delay premature graying.",
    price: 449,
    originalPrice: 599,
    images: [
      "/images/ProductImages/VitaminC.png",
      "/images/ProductImages/Ashuwaganda.png"
    ],
    packSize: "200ml",
    productForm: "Cold Infused Oil",
    ingredients: ["Tila Taila (Wood-pressed Sesame Oil)", "Bhringraj (Eclipta alba) Swaras", "Amla", "Brahmi", "Manjistha", "Nagarmotha", "Lodhra"],
    stockQuantity: 52,
    rating: 4.9,
    reviewCount: 812,
    tags: ["Hair Health", "Cooling", "Scalp Care", "Trending"],
    isFeatured: true,
    isBestSeller: true,
    isTrending: true,
    isNew: false,
    createdAt: "2025-07-28T00:00:00Z",
    variants: [
      { size: "200ml", price: 449, originalPrice: 599 },
      { size: "500ml", price: 899, originalPrice: 1200 }
    ],
    productInformation: {
      storage: "Keep in a dark bottle at normal room temperature.",
      certifications: ["100% Mineral Oil Free", "No Synthetic Fragrance", "Ayush Licensed"],
      origin: "Kerala, India",
      shelfLife: "36 Months"
    },
    warnings: "Gently massage warm oil into scalp 2-3 hours before bath or leave overnight."
  },

  // 3. TRENDING PRODUCTS ("Trending Now")
  {
    id: "prod-009",
    slug: "kumkumadi-tailam-saffron-facial-oil",
    name: "Authentic Kumkumadi Miraculous Tailam",
    brand: "Divyam Ayurveda",
    categoryId: "personal-care",
    subcategoryId: "face-skin-serums",
    subcategory: "Facial & Skin Serums",
    shortDescription: "Classical 26-herb facial elixir crafted with Grade-1 Kashmiri saffron.",
    description: "Referenced in the Ashtanga Hridaya, Kumkumadi Tailam is Ayurveda's legendary golden elixir for radiant complexion. Featuring pure Kashmiri Saffron, Red Sandalwood, Ushira, and Goat's Milk cooked to perfection in cold-pressed sesame oil. Reduces hyperpigmentation and restores a lit-from-within glow.",
    price: 799,
    originalPrice: 1199,
    images: [
      "/images/ProductImages/VitaminC.png",
      "/images/ProductImages/PureHimalayanShilajit.jpeg"
    ],
    packSize: "30ml",
    productForm: "Face Elixir Oil",
    ingredients: ["Kashmiri Saffron (Crocus sativus)", "Rakta Chandana (Pterocarpus santalinus)", "Manjistha (Rubia cordifolia)", "Yashtimadhu", "Sesame Oil", "Goat's Milk"],
    stockQuantity: 34,
    rating: 4.9,
    reviewCount: 468,
    tags: ["Glowing Skin", "Anti-aging", "Kashmiri Saffron", "Trending"],
    isFeatured: true,
    isBestSeller: false,
    isTrending: true,
    isNew: false,
    createdAt: "2025-08-25T00:00:00Z",
    variants: [
      { size: "15ml", price: 499, originalPrice: 699 },
      { size: "30ml", price: 799, originalPrice: 1199 }
    ],
    productInformation: {
      storage: "Keep away from direct heat and light.",
      certifications: ["100% Classical Recipe", "Free from Mineral Oil", "GMP Certified"],
      origin: "Thiruvananthapuram, Kerala, India",
      shelfLife: "24 Months"
    },
    warnings: "Apply 2-3 drops on cleansed, damp face at night. Gently pat until absorbed."
  },
  {
    id: "prod-010",
    slug: "brahmi-memory-focus-churna",
    name: "Medhya Brahmi Churna",
    brand: "Divyam Ayurveda",
    categoryId: "ayurvedic-herbs",
    subcategoryId: "brain-memory",
    subcategory: "Brain & Memory",
    shortDescription: "Single-herb Bacopa monnieri leaf powder for focus, memory, and calm cognition.",
    description: "Revered in Ayurvedic texts as supreme Medhya Rasayana (brain revitalizer). Our Brahmi is wild-harvested from pristine freshwater wetlands and shaded-dried under controlled temperature to guard fragile bacoside bioactive components against heat degradation.",
    price: 280,
    originalPrice: 380,
    images: [
      "/images/ProductImages/Ashuwaganda.png",
      "/images/ProductImages/PureHimalayanShilajit2.jpeg"
    ],
    packSize: "150g",
    productForm: "Powder / Churna",
    ingredients: ["100% Pure Brahmi (Bacopa monnieri) Whole Leaf Powder"],
    stockQuantity: 65,
    rating: 4.7,
    reviewCount: 320,
    tags: ["Cognition", "Memory", "Calm Mind", "Trending"],
    isFeatured: true,
    isBestSeller: false,
    isTrending: true,
    isNew: false,
    createdAt: "2025-09-05T00:00:00Z",
    variants: [
      { size: "150g", price: 280, originalPrice: 380 },
      { size: "300g", price: 510, originalPrice: 700 }
    ],
    productInformation: {
      storage: "Airtight closure in moisture-free pantry.",
      certifications: ["Heavy Metal Tested", "Pesticide Residue Free", "GMP"],
      origin: "Kerala wetlands, India",
      shelfLife: "24 Months"
    },
    warnings: "Mix 1/2 teaspoon with organic ghee and honey or warm milk once daily."
  },
  {
    id: "prod-011",
    slug: "ayush-kwath-kadha-infusion",
    name: "Ayush Kwath Immunity Kadha",
    brand: "Divyam Ayurveda",
    categoryId: "kadha-herbal-teas",
    subcategoryId: "immunity-kadha",
    subcategory: "Immunity & Lung Care Kadha",
    shortDescription: "Ministry of Ayush recommended synergistic formula of Tulsi, Dalchini, Sunthi & Krishna Marich.",
    description: "A fast-acting classical decoction coarse grind tailored to warm the respiratory channels and activate natural defenses. Blended with optimum therapeutic ratios: 4 parts Tulsi, 2 parts Dalchini (Ceylon cinnamon), 2 parts Sunthi (dry ginger), and 1 part Black Pepper.",
    price: 220,
    originalPrice: 300,
    images: [
      "/images/ProductImages/Shilajit.png",
      "/images/ProductImages/PureHimalayanShilajit3.jpeg"
    ],
    packSize: "150g",
    productForm: "Coarse Decoction Blend",
    ingredients: ["Tulsi (Ocimum sanctum) 44.4%", "Dalchini (Cinnamomum zeylanicum) 22.2%", "Sunthi (Zingiber officinale) 22.2%", "Krishna Marich (Piper nigrum) 11.1%"],
    stockQuantity: 88,
    rating: 4.8,
    reviewCount: 412,
    tags: ["Immunity", "Respiratory", "Cold & Flu", "Trending"],
    isFeatured: true,
    isBestSeller: false,
    isTrending: true,
    isNew: false,
    createdAt: "2025-09-12T00:00:00Z",
    variants: [
      { size: "150g", price: 220, originalPrice: 300 },
      { size: "300g", price: 399, originalPrice: 550 }
    ],
    productInformation: {
      storage: "Seal airtight after every scoop.",
      certifications: ["Ayush Ministry Advisory Compliant", "GMP Certified"],
      origin: "India",
      shelfLife: "24 Months"
    },
    warnings: "Boil 3g in 150ml water until reduced to half. Add jaggery or lemon juice if desired."
  },
  {
    id: "prod-012",
    slug: "giloy-neem-tulsi-juice",
    name: "Giloy Neem Tulsi Ras Juice",
    brand: "Divyam Ayurveda",
    categoryId: "herbal-juices",
    subcategoryId: "daily-immunity-swaras",
    subcategory: "Daily Immunity Swaras",
    shortDescription: "Triple immunity powerhouse combining Amrita stem swaras with wild Neem and Holy Basil.",
    description: "Giloy (Tinospora cordifolia) grown exclusively on Neem trees (Neem-chadhya Giloy) absorbs the secondary phytocompounds of both revered plants. Coupled with antioxidant-dense Tulsi, this pure juice gently purifies the bloodstream and bolsters defensive vitality.",
    price: 320,
    originalPrice: 420,
    images: [
      "/images/ProductImages/PureHimalayanShilajit.jpeg",
      "/images/ProductImages/VitaminC.png"
    ],
    packSize: "500ml",
    productForm: "Liquid / Juice",
    ingredients: ["Neem-chadhya Giloy (Tinospora cordifolia) Stem Juice 70%", "Tulsi (Ocimum sanctum) Leaf Juice 20%", "Neem (Azadirachta indica) Leaf Extract 10%"],
    stockQuantity: 40,
    rating: 4.6,
    reviewCount: 295,
    tags: ["Blood Purifier", "Immunity", "Fever Defense", "Trending"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: true,
    isNew: false,
    createdAt: "2025-08-30T00:00:00Z",
    variants: [
      { size: "500ml", price: 320, originalPrice: 420 },
      { size: "1 Litre", price: 580, originalPrice: 780 }
    ],
    productInformation: {
      storage: "Keep in a cool spot. Refrigerate upon opening.",
      certifications: ["GMP Certified", "Sugar Free", "No Synthetic Colors"],
      origin: "Madhya Pradesh, India",
      shelfLife: "18 Months"
    },
    warnings: "Take 30ml diluted in 100ml warm water daily morning."
  },

  // 4. NEW ARRIVALS ("Fresh Additions")
  {
    id: "prod-013",
    slug: "shatavari-kalpa-granules",
    name: "Shatavari Rasayana Kalpa",
    brand: "Divyam Ayurveda",
    categoryId: "wellness-essentials",
    subcategoryId: "vitality-adaptogens",
    subcategory: "Vitality & Adaptogens",
    shortDescription: "Women's restorative tonic granules enriched with wild asparagus and cardamom.",
    description: "A cherished adaptogen for female wellness across all life stages. Fresh Shatavari tuber decoction is carefully concentrated with organic cane syrup and fragrant cardamom pods. Encourages hormonal harmony, lactation support, and radiant vitality.",
    price: 360,
    originalPrice: 480,
    images: [
      "/images/ProductImages/PureHimalayanShilajit2.jpeg",
      "/images/ProductImages/Ashuwaganda.png"
    ],
    packSize: "250g",
    productForm: "Delicious Herbal Granules",
    ingredients: ["Shatavari (Asparagus racemosus) Tuber Extract 30%", "Elaichi (Elettaria cardamomum)", "Natural Unrefined Cane Sugar Base"],
    stockQuantity: 48,
    rating: 4.9,
    reviewCount: 184,
    tags: ["Women Wellness", "Hormonal Balance", "Energy", "New Arrival"],
    isFeatured: true,
    isBestSeller: false,
    isTrending: false,
    isNew: true,
    createdAt: "2026-02-10T00:00:00Z",
    variants: [
      { size: "250g", price: 360, originalPrice: 480 },
      { size: "500g", price: 650, originalPrice: 890 }
    ],
    productInformation: {
      storage: "Keep tightly capped in a dry environment.",
      certifications: ["GMP Certified", "Heavy Metal Tested"],
      origin: "Maharashtra, India",
      shelfLife: "24 Months"
    },
    warnings: "Stir 1-2 teaspoons into warm cow's milk or almond milk twice daily."
  },
  {
    id: "prod-014",
    slug: "churna-hingwashtak-digestive",
    name: "Classical Hingwashtak Churna",
    brand: "Divyam Ayurveda",
    categoryId: "digestive-wellness",
    subcategoryId: "acidity-gas",
    subcategory: "Acidity & Gas Relief",
    shortDescription: "Pure Shuddha Hing with 7 digestive spices to banish bloating and sluggish digestion.",
    description: "An indispensable Ayurvedic household staple formulated as per Bhaishajya Ratnavali. Blends purified Hing (asafoetida), Trikatu (dry ginger, black pepper, pippali), Ajwain, Saindhava Lavana, and Jeera. Quickly relieves gastric distress and rekindles optimal digestive fire.",
    price: 180,
    originalPrice: 240,
    images: [
      "/images/ProductImages/PureHimalayanShilajit3.jpeg",
      "/images/ProductImages/Shilajit.png"
    ],
    packSize: "100g",
    productForm: "Powder / Churna",
    ingredients: ["Shuddha Hing (Ferula foetida)", "Sunthi", "Maricha", "Pippali", "Ajwain", "Saindhava Lavana (Himalayan Rock Salt)", "Shweta Jeeraka", "Krishna Jeeraka"],
    stockQuantity: 70,
    rating: 4.8,
    reviewCount: 156,
    tags: ["Digestive Fire", "Gas Relief", "Classical Granthokta", "New Arrival"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: true,
    createdAt: "2026-02-14T00:00:00Z",
    variants: [
      { size: "100g", price: 180, originalPrice: 240 },
      { size: "250g", price: 390, originalPrice: 520 }
    ],
    productInformation: {
      storage: "Keep container securely sealed to retain aromatic volatile oils.",
      certifications: ["FSSAI", "GMP Compliant"],
      origin: "Gujarat, India",
      shelfLife: "24 Months"
    },
    warnings: "Take 1-2g with the first mouthful of warm cooked rice and ghee."
  },
  {
    id: "prod-015",
    slug: "dhanwantaram-tailam-body-oil",
    name: "Dhanwantaram Thailam Abhyanga Oil",
    brand: "Divyam Ayurveda",
    categoryId: "herbal-oils",
    subcategoryId: "pain-relief-oils",
    subcategory: "Joint & Pain Relief",
    shortDescription: "Premier classical post-workout & daily Abhyanga restorative oil for Vata pacification.",
    description: "Boasting over 40 classical herbs including Bala root, Dashamoola, and Cow's milk cooked in aged sesame oil. Dhanwantaram Thailam is Kerala Ayurveda's crown jewel for self-massage (Abhyanga). Rejuvenates weary muscles, relieves joint stiffness, and calms an overstimulated nervous system.",
    price: 499,
    originalPrice: 650,
    images: [
      "/images/ProductImages/VitaminC.png",
      "/images/ProductImages/PureHimalayanShilajit.jpeg"
    ],
    packSize: "200ml",
    productForm: "Massage Oil / Thailam",
    ingredients: ["Bala (Sida cordifolia)", "Dashamoola 10 Roots", "Yava", "Kulaṭṭha", "Tila Taila", "Godugdha"],
    stockQuantity: 58,
    rating: 4.9,
    reviewCount: 210,
    tags: ["Abhyanga", "Joint Care", "Vata Balance", "New Arrival"],
    isFeatured: true,
    isBestSeller: false,
    isTrending: false,
    isNew: true,
    createdAt: "2026-01-20T00:00:00Z",
    variants: [
      { size: "200ml", price: 499, originalPrice: 650 },
      { size: "450ml", price: 950, originalPrice: 1250 }
    ],
    productInformation: {
      storage: "Warm slightly in hot water bath before application.",
      certifications: ["Authentic Kerala Formulation", "100% Herbal"],
      origin: "Thrissur, Kerala, India",
      shelfLife: "36 Months"
    },
    warnings: "External use only. Avoid immediate exposure to cold drafts after massage."
  },
  {
    id: "prod-016",
    slug: "organic-moringa-leaf-powder",
    name: "Superfood Organic Moringa Leaf Powder",
    brand: "Divyam Ayurveda",
    categoryId: "churna-powders",
    subcategoryId: "nutrition-powders",
    subcategory: "Nutritional & Detox Powders",
    shortDescription: "Shade-dried drumstick tree leaves loaded with 90+ micronutrients and plant protein.",
    description: "Referred to as 'Shigru' in Sanskrit, Moringa is ancient India's supreme vitality plant. Our pristine green powder is ground from farm-fresh leaves shade-dried within hours to retain natural chlorophyll, iron, calcium, and plant bioflavonoids.",
    price: 230,
    originalPrice: 320,
    images: [
      "/images/ProductImages/Himalya.png",
      "/images/ProductImages/PureHimalayanShilajit2.jpeg"
    ],
    packSize: "200g",
    productForm: "Powder / Churna",
    ingredients: ["100% Pure Organic Moringa (Moringa oleifera) Leaf Powder"],
    stockQuantity: 95,
    rating: 4.7,
    reviewCount: 142,
    tags: ["Superfood", "Energy", "Plant Protein", "New Arrival"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: true,
    createdAt: "2026-02-01T00:00:00Z",
    variants: [
      { size: "200g", price: 230, originalPrice: 320 },
      { size: "500g", price: 499, originalPrice: 680 }
    ],
    productInformation: {
      storage: "Keep in a cool, dark cabinet.",
      certifications: ["Organic India NPOP", "USDA Certified", "Non-GMO"],
      origin: "Tamil Nadu, India",
      shelfLife: "24 Months"
    },
    warnings: "Mix 1 teaspoon with green smoothies, soups, or warm lemon water."
  },

  // 5. ADDITIONAL AUTHENTIC AYURVEDIC ESSENTIALS (CATALOG & COLLECTIONS)
  {
    id: "prod-017",
    slug: "chyawanprash-special-gold-kesar",
    name: "Swarna Kesar Chyawanprash Rasayana",
    brand: "Divyam Ayurveda",
    categoryId: "wellness-essentials",
    subcategoryId: "chyawanprash-rasayana",
    subcategory: "Chyawanprash & Lehyams",
    shortDescription: "Authentic winter preparation with wild Amla pulp, Kashmiri Kesar, and 48 classical botanicals.",
    description: "Slow-cooked in small artisan batches in pure desi cow ghee and wild forest honey. Packed with potent adaptogens, Pippali, Dashamoola, and real silver/gold bhasma micro-particles to bolster seasonal resilience, lung health, and vitality for all family members.",
    price: 650,
    originalPrice: 850,
    images: [
      "/images/ProductImages/PureHimalayanShilajit.jpeg",
      "/images/ProductImages/PureHimalayanShilajit3.jpeg"
    ],
    packSize: "500g",
    productForm: "Herbal Jam / Avaleha",
    ingredients: ["Fresh Wild Amla Pulp 60%", "Desi Cow Ghee 10%", "Wild Forest Honey 15%", "Kashmiri Kesar", "Classical Dashamoola Extract"],
    stockQuantity: 50,
    rating: 4.9,
    reviewCount: 630,
    tags: ["Immunity", "Respiratory", "Winter Vitality", "Featured"],
    isFeatured: true,
    isBestSeller: false,
    isTrending: true,
    isNew: false,
    createdAt: "2025-10-01T00:00:00Z",
    variants: [
      { size: "500g", price: 650, originalPrice: 850 },
      { size: "1kg", price: 1199, originalPrice: 1550 }
    ],
    productInformation: {
      storage: "Room temperature. Do not put a wet spoon inside.",
      certifications: ["Ayush Premium Mark", "GMP Certified"],
      origin: "Haridwar, Uttarakhand, India",
      shelfLife: "36 Months"
    },
    warnings: "Consume 1 tablespoon daily morning followed by a glass of lukewarm milk."
  },
  {
    id: "prod-018",
    slug: "neem-purifying-daily-face-wash",
    name: "Neem & Tea Tree Clarifying Face Wash",
    brand: "Divyam Ayurveda",
    categoryId: "personal-care",
    subcategoryId: "face-skin-care",
    subcategory: "Facial & Skin Care (Ubtan)",
    shortDescription: "Gentle soap-free cleanser infused with cold-pressed Neem leaf oil and Haldi extract.",
    description: "An Ayurvedic face wash that cleanses deeply without depleting the skin’s natural lipid barrier. Cold-pressed Neem and Tea Tree regulate sebum and combat blemishes, while pure Haldi (Turmeric) soothes redness and calms irritation.",
    price: 249,
    originalPrice: 329,
    images: [
      "/images/ProductImages/VitaminC.png",
      "/images/ProductImages/Ashuwaganda.png"
    ],
    packSize: "150ml",
    productForm: "Gel Cleanser",
    ingredients: ["Purified Water", "Neem (Azadirachta indica) Leaf Extract", "Tea Tree (Melaleuca alternifolia) Leaf Oil", "Haldi (Curcuma longa)", "Coconut derived cleansing base"],
    stockQuantity: 62,
    rating: 4.7,
    reviewCount: 395,
    tags: ["Acne Care", "Clear Skin", "Sulphate Free", "Personal Care"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: false,
    createdAt: "2025-07-15T00:00:00Z",
    variants: [
      { size: "150ml", price: 249, originalPrice: 329 },
      { size: "300ml", price: 449, originalPrice: 599 }
    ],
    productInformation: {
      storage: "Normal room conditions.",
      certifications: ["Dermatologically Tested", "Cruelty Free"],
      origin: "India",
      shelfLife: "24 Months"
    },
    warnings: "Gently massage onto wet face in circular motion and rinse thoroughly."
  },
  {
    id: "prod-019",
    slug: "arjuna-bark-powder-heart-care",
    name: "Arjuna Bark (Chhal) Heart Tonic Powder",
    brand: "Divyam Ayurveda",
    categoryId: "ayurvedic-herbs",
    subcategoryId: "single-herbs",
    subcategory: "Single Herb Roots",
    shortDescription: "Sun-dried Terminalia arjuna tree bark for cardiovascular strength and blood circulation.",
    description: "Revered in Ayurvedic cardiology (Hridaya Rasayana) for millennia. The bark of wild Arjuna trees is sustainably peeled, air-dried, and finely pulverized. Enriched with natural CoQ10 precursors, arjunolic acid, and flavonoids that tone cardiac muscle tissues.",
    price: 210,
    originalPrice: 280,
    images: [
      "/images/ProductImages/Ashuwaganda.png",
      "/images/ProductImages/Shilajit.png"
    ],
    packSize: "200g",
    productForm: "Powder / Churna",
    ingredients: ["100% Pure Arjuna (Terminalia arjuna) Stem Bark Powder"],
    stockQuantity: 55,
    rating: 4.8,
    reviewCount: 278,
    tags: ["Heart Health", "Circulation", "Classical Herb"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: false,
    createdAt: "2025-06-25T00:00:00Z",
    variants: [
      { size: "200g", price: 210, originalPrice: 280 },
      { size: "500g", price: 460, originalPrice: 620 }
    ],
    productInformation: {
      storage: "Keep away from moisture in airtight jar.",
      certifications: ["GMP Certified", "Ayush Licensed"],
      origin: "Madhya Pradesh, India",
      shelfLife: "24 Months"
    },
    warnings: "Boil 1 tsp in 1 cup milk and 1 cup water until water evaporates (Ksheerapaka method)."
  },
  {
    id: "prod-020",
    slug: "karela-jamun-healthy-sugar-juice",
    name: "Karela Jamun Sugar Balance Juice",
    brand: "Divyam Ayurveda",
    categoryId: "herbal-juices",
    subcategoryId: "metabolism-sugar",
    subcategory: "Sugar & Metabolism Care",
    shortDescription: "Bitter gourd and black plum seed extract supporting balanced glycemic metabolism.",
    description: "Synergistic herbal blend of wild bitter melon (Karela) and whole Jamun fruit with crushed inner seeds. Naturally contains charantin, vicine, and polypeptide-p. Aids glucose metabolism, stimulates pancreatic enzymes, and purifies hepatic pathways.",
    price: 310,
    originalPrice: 410,
    images: [
      "/images/ProductImages/PureHimalayanShilajit2.jpeg",
      "/images/ProductImages/VitaminC.png"
    ],
    packSize: "500ml",
    productForm: "Liquid / Juice",
    ingredients: ["Wild Karela (Momordica charantia) Fruit Juice 50%", "Jamun (Syzygium cumini) Fruit & Seed Extract 49.8%"],
    stockQuantity: 65,
    rating: 4.6,
    reviewCount: 310,
    tags: ["Glycemic Support", "Metabolism", "No Added Sugar"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: false,
    createdAt: "2025-07-30T00:00:00Z",
    variants: [
      { size: "500ml", price: 310, originalPrice: 410 },
      { size: "1 Litre", price: 560, originalPrice: 750 }
    ],
    productInformation: {
      storage: "Keep in a cool dry place. Refrigerate once opened.",
      certifications: ["FSSAI Certified", "Sugar Free"],
      origin: "Maharashtra, India",
      shelfLife: "18 Months"
    },
    warnings: "Drink 30ml with equal water 30 minutes before breakfast."
  },
  {
    id: "prod-021",
    slug: "brahmi-shankhpushpi-syrup",
    name: "Shankhpushpi & Brahmi Calming Syrup",
    brand: "Divyam Ayurveda",
    categoryId: "digestive-wellness",
    subcategoryId: "brain-memory",
    subcategory: "Brain & Memory",
    shortDescription: "Non-drowsy herbal tonic for mental fatigue, nervous tension, and restful sleep.",
    description: "Formulated with Convolvulus pluricaulis (Shankhpushpi), Gotu Kola, and Brahmi infused in a natural unrefined jaggery syrup base. Nourishes Majja Dhatu (nervous system), eases work-induced mental stress, and promotes tranquil bedtime relaxation.",
    price: 240,
    originalPrice: 320,
    images: [
      "/images/ProductImages/Shilajit.png",
      "/images/ProductImages/PureHimalayanShilajit.jpeg"
    ],
    packSize: "200ml",
    productForm: "Herbal Syrup",
    ingredients: ["Shankhpushpi (Convolvulus pluricaulis)", "Brahmi (Bacopa monnieri)", "Jatamansi", "Ashwagandha", "Jaggery Base"],
    stockQuantity: 44,
    rating: 4.7,
    reviewCount: 195,
    tags: ["Sleep", "Stress Relief", "Nervous Tonic"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: false,
    createdAt: "2025-08-18T00:00:00Z",
    variants: [
      { size: "200ml", price: 240, originalPrice: 320 },
      { size: "450ml", price: 470, originalPrice: 620 }
    ],
    productInformation: {
      storage: "Store away from intense sunlight.",
      certifications: ["Ayush Licensed", "GMP"],
      origin: "India",
      shelfLife: "36 Months"
    },
    warnings: "1-2 teaspoons twice daily with water after meals."
  },
  {
    id: "prod-022",
    slug: "pain-relief-mahanarayan-tailam",
    name: "Classical Mahanarayan Tailam",
    brand: "Divyam Ayurveda",
    categoryId: "herbal-oils",
    subcategoryId: "pain-relief-oils",
    subcategory: "Joint & Pain Relief",
    shortDescription: "Traditional 54-herb tailam boiled for joint flexibility, arthritis comfort, and back relief.",
    description: "Prepared according to the timeless formula in the Bhaishajya Ratnavali. Featuring Dashamoola, Shatavari, Ashwagandha, and camphor cooked in pure sesame oil. Penetrates deeply into connective tissues to lubricate stiff joints and ease chronic muscular aches.",
    price: 390,
    originalPrice: 520,
    images: [
      "/images/ProductImages/VitaminC.png",
      "/images/ProductImages/PureHimalayanShilajit3.jpeg"
    ],
    packSize: "200ml",
    productForm: "Medicated Oil",
    ingredients: ["Sesame Oil (Tila Taila)", "Bilva", "Agnimantha", "Shyonaka", "Patala", "Kantakari", "Gokshura", "Rasna", "Ashwagandha"],
    stockQuantity: 60,
    rating: 4.8,
    reviewCount: 382,
    tags: ["Joint Relief", "Back Pain", "Ayurvedic Tailam"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: false,
    createdAt: "2025-06-10T00:00:00Z",
    variants: [
      { size: "200ml", price: 390, originalPrice: 520 },
      { size: "500ml", price: 799, originalPrice: 1050 }
    ],
    productInformation: {
      storage: "Store at room temperature. Warm bottle in hot water before massage.",
      certifications: ["GMP Certified", "100% Classical"],
      origin: "Varanasi, UP, India",
      shelfLife: "36 Months"
    },
    warnings: "Warm the oil gently and apply on affected joints with light pressure."
  },
  {
    id: "prod-023",
    slug: "shilajit-pure-himalayan-resin",
    name: "Pure Himalayan Shilajit Resin (Gold Grade)",
    brand: "Divyam Ayurveda",
    categoryId: "wellness-essentials",
    subcategoryId: "himalayan-shilajit",
    subcategory: "Pure Himalayan Shilajit",
    shortDescription: "18,000+ ft altitude purified black asphaltum rich in 80+ trace minerals and fulvic acid.",
    description: "Sourced directly from steep rocky cliffs in the higher Himalayas above 18,000 feet. Purified using classical Shodhana with Triphala water and sun-dried to yield an ultra-pure resin with >75% fulvic acid. Delivers cellular energy, stamina, and deep physical rejuvenative power.",
    price: 999,
    originalPrice: 1499,
    images: [
      "/images/ProductImages/PureHimalayanShilajit.jpeg",
      "/images/ProductImages/PureHimalayanShilajit2.jpeg",
      "/images/ProductImages/PureHimalayanShilajit3.jpeg",
      "/images/ProductImages/Himalya.png"
    ],
    packSize: "20g",
    productForm: "Pure Mineral Resin",
    ingredients: ["100% Purified Himalayan Shilajit Resin (75%+ Fulvic Acid)"],
    stockQuantity: 38,
    rating: 4.9,
    reviewCount: 512,
    tags: ["Stamina", "Fulvic Acid", "Himalayan", "Featured"],
    isFeatured: true,
    isBestSeller: false,
    isTrending: true,
    isNew: false,
    createdAt: "2025-11-05T00:00:00Z",
    variants: [
      { size: "20g", price: 999, originalPrice: 1499 },
      { size: "50g", price: 2199, originalPrice: 3200 }
    ],
    productInformation: {
      storage: "Keep in a cool dry place. Use spoon provided.",
      certifications: ["Lab Tested for Heavy Metals", "GMP Certified", "Ayush Premium"],
      origin: "Spiti & Ladakh High Himalayas, India",
      shelfLife: "36 Months"
    },
    warnings: "Dissolve a pea-sized amount (300-500mg) in warm water, milk, or green tea."
  },
  {
    id: "prod-024",
    slug: "avipattikar-churna-hyperacidity",
    name: "Classical Avipattikar Churna",
    brand: "Divyam Ayurveda",
    categoryId: "digestive-wellness",
    subcategoryId: "acidity-gas",
    subcategory: "Acidity & Gas Relief",
    shortDescription: "Soothes excessive stomach Pitta, sour belching, heartburn, and constipation.",
    description: "An authentic classical preparation engineered to alleviate severe Pitta imbalance in the digestive tract. Combines cooling Nishoth, clove, Trivrit, and cardamom to pacify high hydrochloric acid production and encourage healthy morning bowel evacuations.",
    price: 195,
    originalPrice: 260,
    images: [
      "/images/ProductImages/PureHimalayanShilajit3.jpeg",
      "/images/ProductImages/Ashuwaganda.png"
    ],
    packSize: "100g",
    productForm: "Powder / Churna",
    ingredients: ["Trikatu", "Triphala", "Musta", "Vida Lavana", "Vidanga", "Ela", "Patra", "Lavanga", "Trivrit", "Sharkara (Rock Sugar)"],
    stockQuantity: 72,
    rating: 4.8,
    reviewCount: 220,
    tags: ["Acidity Relief", "Pitta Pacifier", "Digestive"],
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNew: false,
    createdAt: "2025-05-19T00:00:00Z",
    variants: [
      { size: "100g", price: 195, originalPrice: 260 },
      { size: "250g", price: 420, originalPrice: 560 }
    ],
    productInformation: {
      storage: "Store dry.",
      certifications: ["GMP Certified", "Ayush Approved"],
      origin: "India",
      shelfLife: "24 Months"
    },
    warnings: "Take 3-5g before meals with cold water or coconut water."
  }
];

