import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { contentService } from "../../services/api";
import { ScrollReveal } from "../../animations/useScrollReveal";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

export const BlogHighlightsSection = () => {
  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    try {
      const data = await contentService.getBlogPosts();
      setPosts(data);
    } catch (err) {
      console.error("Error loading blog posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();

    const handleUpdate = () => {
      fetchPosts();
    };

    window.addEventListener("divyam_blog_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("divyam_blog_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="py-14 bg-[#FBFAF6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal yOffset={16} duration={500} className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#173D2A]/10 text-[#173D2A]">
                <BookOpen size={16} />
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#171A17]">
                Ayurvedic Knowledge &amp; Insights
              </h2>
              <div className="h-0.5 w-16 bg-[#386B40] rounded-full hidden sm:block" />
            </div>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Deepen your understanding of ancient healing traditions, formulation forms, and herb purity.
            </p>
          </div>

          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#173D2A] hover:text-[#386B40] transition-colors shrink-0 group"
          >
            <span>View All Articles</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>

        {/* 3 Article Cards Grid with Framer Motion Stagger */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {posts.slice(0, 3).map((post) => (
            <motion.div
              key={post.id}
              variants={cardVariants}
              whileHover={{ y: -7, transition: { duration: 0.28, ease: "easeOut" } }}
              className="h-full flex"
            >
              <article className="bg-white rounded-2xl border border-[#E5E7DF] overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:border-[#A9D18E]/70 w-full h-full">
                {/* Image Banner with Deep Pan & Zoom */}
                <Link to={`/blog/${post.slug}`} className="block relative aspect-16/10 overflow-hidden bg-stone-50 flex items-center justify-center p-3">
                  <img
                    src={post.image || "/images/ProductImages/Himalya.png"}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out"
                    onError={(e) => {
                      e.target.src = "/images/ProductImages/Himalya.png";
                    }}
                  />
                  {/* Subtle hover gradient wash */}
                  <div className="absolute inset-0 bg-[#173D2A]/0 group-hover:bg-[#173D2A]/5 transition-colors duration-300 pointer-events-none" />

                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 text-[11px] font-semibold bg-white/95 text-[#173D2A] rounded-md shadow-xs group-hover:bg-[#173D2A] group-hover:text-white transition-all duration-300">
                    {post.category}
                  </span>
                </Link>

                {/* Body */}
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-[#666B64] mb-2.5">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="group-hover:text-[#386B40] transition-colors" /> {post.readTime}
                    </span>
                    <span>&bull;</span>
                    <span>{post.author}</span>
                  </div>

                  <Link to={`/blog/${post.slug}`} className="block mb-2">
                    <h3 className="font-heading text-base sm:text-lg font-bold tracking-tight text-[#171A17] group-hover:text-[#173D2A] transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-[#666B64] line-clamp-3 mb-5 leading-relaxed font-light flex-1">
                    {post.excerpt}
                  </p>

                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#386B40] group-hover:text-[#173D2A] transition-colors group/link mt-auto pt-2"
                  >
                    <span>Read Full Article</span>
                    <ArrowRight size={13} className="group-hover/link:translate-x-1.5 transition-transform duration-200" />
                  </Link>
                </div>
              </article>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
