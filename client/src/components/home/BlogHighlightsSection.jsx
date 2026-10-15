import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { contentService } from "../../services/api";

export const BlogHighlightsSection = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await contentService.getBlogPosts();
        setPosts(data);
      } catch (err) {
        console.error("Error loading blog posts:", err);
      }
    };
    fetchPosts();
  }, []);

  return (
    <section className="py-14 bg-[#FBFAF6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#173D2A]/10 text-[#173D2A]">
                <BookOpen size={16} />
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#171A17]">
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
        </div>

        {/* 3 Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.slice(0, 3).map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl border border-[#E5E7DF] overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-md hover:border-[#A9D18E]/60"
            >
              {/* Image Banner */}
              <Link to={`/blog/${post.slug}`} className="block relative aspect-16/10 overflow-hidden bg-stone-50 flex items-center justify-center p-3">
                <img
                  src={post.image || "/images/ProductImages/Himalya.png"}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = "/images/ProductImages/Himalya.png";
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 text-[11px] font-semibold bg-white/95 text-[#173D2A] rounded-md shadow-xs">
                  {post.category}
                </span>
              </Link>

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-[11px] text-[#666B64] mb-2">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {post.readTime}
                  </span>
                  <span>&bull;</span>
                  <span>{post.author}</span>
                </div>

                <Link to={`/blog/${post.slug}`} className="block mb-2">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#171A17] group-hover:text-[#173D2A] transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>
                </Link>

                <p className="text-xs text-[#666B64] line-clamp-3 mb-4 leading-relaxed flex-1">
                  {post.excerpt}
                </p>

                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#386B40] group-hover:text-[#173D2A] transition-colors group/link"
                >
                  <span>Read Full Article</span>
                  <ArrowRight size={13} className="group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

