/**
 * Categories & Subcategories data for Divyam Ayurveda
 * Matches the circular category shortcuts, mega menu navigation, and product filtering.
 */

export const categories = [
  {
    id: "ayurvedic-herbs",
    slug: "ayurvedic-herbs",
    name: "Ayurvedic Herbs",
    shortName: "Herbs",
    description: "Sustainably harvested single and classical Indian medicinal herbs.",
    image: "/images/ProductImages/Ashuwaganda.png",
    itemCount: 8,
    bannerImage: "/images/ProductImages/Himalya.png",
    featured: true,
    subcategories: [
      {
        id: "vitality-adaptogens",
        slug: "vitality-adaptogens",
        name: "Vitality & Adaptogens",
        description: "Rejuvenating adaptogens like Ashwagandha and Shatavari for stamina and vigor.",
      },
      {
        id: "immunity-rasayana",
        slug: "immunity-rasayana",
        name: "Immunity & Rasayana",
        description: "Potent protective herbs including Giloy, Tulsi, and Wild Amla.",
      },
      {
        id: "brain-memory",
        slug: "brain-memory",
        name: "Brain & Memory",
        description: "Medhya herbs like Brahmi and Shankhpushpi for mental clarity and calm.",
      },
      {
        id: "single-herbs",
        slug: "single-herbs",
        name: "Single Herb Roots",
        description: "Pure single-origin botanical roots, barks, and leaves.",
      },
    ],
  },
  {
    id: "churna-powders",
    slug: "churna-powders",
    name: "Churna & Powders",
    shortName: "Churnas",
    description: "Traditional finely micro-pulverized herbal churnas formulated as per classical granthas.",
    image: "/images/ProductImages/PureHimalayanShilajit2.jpeg",
    itemCount: 6,
    bannerImage: "/images/ProductImages/PureHimalayanShilajit3.jpeg",
    featured: true,
    subcategories: [
      {
        id: "digestive-churnas",
        slug: "digestive-churnas",
        name: "Classical Digestive Churnas",
        description: "Time-honored recipes like Triphala, Hingwashtak, and Avipattikar Churna.",
      },
      {
        id: "single-powders",
        slug: "single-powders",
        name: "Single Herb Powders",
        description: "100% pure single-herb churnas milled to optimal bioavailability.",
      },
      {
        id: "nutrition-powders",
        slug: "nutrition-powders",
        name: "Nutritional & Detox Powders",
        description: "Lakadong Turmeric, Moringa Leaf, and organic functional superfoods.",
      },
    ],
  },
  {
    id: "herbal-oils",
    slug: "herbal-oils",
    name: "Herbal Oils",
    shortName: "Oils",
    description: "Cold-pressed tailams and botanical oils infused with potent restorative herbs.",
    image: "/images/ProductImages/VitaminC.png",
    itemCount: 6,
    bannerImage: "/images/ProductImages/VitaminC.png",
    featured: true,
    subcategories: [
      {
        id: "hair-scalp-tailams",
        slug: "hair-scalp-tailams",
        name: "Hair & Scalp Tailams",
        description: "Classical Bhringraj and Amla hair elixirs for deep follicular nourishment.",
      },
      {
        id: "pain-relief-oils",
        slug: "pain-relief-oils",
        name: "Joint & Pain Relief",
        description: "Mahanarayan and Nirgundi oils for muscular comfort and flexibility.",
      },
      {
        id: "face-skin-serums",
        slug: "face-skin-serums",
        name: "Facial & Skin Serums",
        description: "Precious Kumkumadi and Nalpamaradi oils for radiant complexion.",
      },
      {
        id: "nasal-ear-care",
        slug: "nasal-ear-care",
        name: "Nasal & Ear Care (Nasya)",
        description: "Classical Anu Tailam and Shadbindu oils for sensory organ health.",
      },
    ],
  },
  {
    id: "herbal-juices",
    slug: "herbal-juices",
    name: "Herbal Juices",
    shortName: "Juices",
    description: "Pure, cold-extracted herbal swaras juices without added refined sugar or artificial colours.",
    image: "/images/ProductImages/PureHimalayanShilajit.jpeg",
    itemCount: 5,
    bannerImage: "/images/ProductImages/Himalya.png",
    featured: true,
    subcategories: [
      {
        id: "daily-immunity-swaras",
        slug: "daily-immunity-swaras",
        name: "Daily Immunity Swaras",
        description: "Pure Wild Amla and Giloy juices for year-round vitality.",
      },
      {
        id: "detox-weight",
        slug: "detox-weight",
        name: "Detox & Weight Balance",
        description: "Cold-extracted Aloe Vera, Wheatgrass, and Triphala juices.",
      },
      {
        id: "metabolism-sugar",
        slug: "metabolism-sugar",
        name: "Sugar & Metabolism Care",
        description: "Karela Jamun and Madhunashini herbal swaras.",
      },
    ],
  },
  {
    id: "kadha-herbal-teas",
    slug: "kadha-herbal-teas",
    name: "Kadha & Herbal Teas",
    shortName: "Teas & Kadha",
    description: "Time-tested herbal decoction blends and caffeine-free wellness infusions.",
    image: "/images/ProductImages/Shilajit.png",
    itemCount: 5,
    bannerImage: "/images/ProductImages/PureHimalayanShilajit2.jpeg",
    featured: true,
    subcategories: [
      {
        id: "immunity-kadha",
        slug: "immunity-kadha",
        name: "Immunity & Lung Care Kadha",
        description: "Classical Ayush Kwath decoction blends with Tulsi, Dalchini, and Sunthi.",
      },
      {
        id: "digestive-teas",
        slug: "digestive-teas",
        name: "Digestive (CCF) Teas",
        description: "Cumin, Coriander, and Fennel balancing digestive infusions.",
      },
      {
        id: "stress-sleep-teas",
        slug: "stress-sleep-teas",
        name: "Stress Relief & Night Teas",
        description: "Chamomile, Brahmi, and Ashwagandha calming bedtime teas.",
      },
    ],
  },
  {
    id: "digestive-wellness",
    slug: "digestive-wellness",
    name: "Digestive Wellness",
    shortName: "Digestive",
    description: "Classical formulation blends that kindle Agni and support balanced gut equilibrium.",
    image: "/images/ProductImages/PureHimalayanShilajit3.jpeg",
    itemCount: 5,
    bannerImage: "/images/ProductImages/PureHimalayanShilajit.jpeg",
    featured: true,
    subcategories: [
      {
        id: "acidity-gas",
        slug: "acidity-gas",
        name: "Acidity & Gas Relief",
        description: "Herbal pachaks, Avipattikar blends, and cooling Pitta balancers.",
      },
      {
        id: "bowel-cleanse",
        slug: "bowel-cleanse",
        name: "Bowel Cleansing & Constipation",
        description: "Triphala formulations and natural psyllium herbal husks.",
      },
      {
        id: "digestive-vati",
        slug: "digestive-vati",
        name: "Digestive Vati & Candy",
        description: "Appetizing Hing Vati and digestive chewables.",
      },
    ],
  },
  {
    id: "personal-care",
    slug: "personal-care",
    name: "Personal Care",
    shortName: "Personal Care",
    description: "Holistic botanical skin and hair elixirs free from parabens, SLS, and artificial fragrances.",
    image: "/images/ProductImages/VitaminC.png",
    itemCount: 6,
    bannerImage: "/images/ProductImages/VitaminC.png",
    featured: true,
    subcategories: [
      {
        id: "face-skin-care",
        slug: "face-skin-care",
        name: "Facial & Skin Care (Ubtan)",
        description: "Traditional herbal face packs, rose water toners, and glow elixirs.",
      },
      {
        id: "herbal-hair-care",
        slug: "herbal-hair-care",
        name: "Herbal Hair Cleansers",
        description: "Shikakai, Reetha, and Bhringraj clarifying shampoos and conditioners.",
      },
      {
        id: "bath-body-care",
        slug: "bath-body-care",
        name: "Therapeutic Soaps & Body Care",
        description: "Cold-processed Neem Tulsi soaps and nourishing body butters.",
      },
    ],
  },
  {
    id: "wellness-essentials",
    slug: "wellness-essentials",
    name: "Wellness Essentials",
    shortName: "Essentials",
    description: "Foundational vitality supplements, Chyawanprash, and daily adaptogens for whole-body vitality.",
    image: "/images/ProductImages/Himalya.png",
    itemCount: 6,
    bannerImage: "/images/ProductImages/Himalya.png",
    featured: true,
    subcategories: [
      {
        id: "himalayan-shilajit",
        slug: "himalayan-shilajit",
        name: "Pure Himalayan Shilajit",
        description: "Grade-A pure Himalayan Shilajit resin tested for maximum fulvic acid.",
      },
      {
        id: "chyawanprash-rasayana",
        slug: "chyawanprash-rasayana",
        name: "Chyawanprash & Lehyams",
        description: "Authentic multi-herb nutritive jams simmered with wild forest honey and cow ghee.",
      },
      {
        id: "wild-honey",
        slug: "wild-honey",
        name: "Raw Forest Honey",
        description: "Unpasteurized, ethically harvested single-origin multiflora raw nectar.",
      },
    ],
  },
];

/**
 * Helper to get all subcategories across all categories
 */
export const getAllSubcategories = () => {
  return categories.flatMap((cat) =>
    (cat.subcategories || []).map((sub) => ({
      ...sub,
      categoryId: cat.id,
      categoryName: cat.name,
      categorySlug: cat.slug,
    }))
  );
};

/**
 * Helper to get subcategories for a specific category ID or slug
 */
export const getSubcategoriesByCategory = (categoryIdOrSlug) => {
  if (!categoryIdOrSlug) return [];
  const normalized = categoryIdOrSlug.toLowerCase();
  const cat = categories.find(
    (c) =>
      c.id.toLowerCase() === normalized ||
      c.slug.toLowerCase() === normalized ||
      c.name.toLowerCase() === normalized
  );
  return cat ? cat.subcategories || [] : [];
};
