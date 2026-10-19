import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { contentService } from "../services/api";
import { formatDate } from "../utils/formatters";

export const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPosts = async () => {
      try {
        const data = await contentService.getBlogPosts();
        if (isMounted && Array.isArray(data)) {
          setPosts(data);
        }
      } catch (err) {
        console.error("Error loading blog posts:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPosts();

    const handleUpdate = () => {
      fetchPosts();
    };

    window.addEventListener("divyam_blog_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("divyam_blog_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Ayurvedic Knowledge & Blog" }]} />

        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto py-8 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center justify-center gap-1.5">
            <BookOpen size={14} /> Traditional Insights
          </span>
          <h1 className="font-heading tracking-tight text-3xl sm:text-5xl font-bold text-[#171A17]">
            Ayurveda Education &amp; Insights
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
            Read expert articles on classical texts, decoding ingredient labels, formulation forms, and holistic daily lifestyle routines.
          </p>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-[#E5E7DF] h-80 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-stone-500">
            No articles published yet. Check back soon for traditional Ayurvedic insights!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-8">
            {posts.map((post) => (
            <article
              key={post.id || post._id || post.slug}
              className="bg-white rounded-3xl border border-[#E5E7DF] overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-md hover:border-[#A9D18E]/60 shadow-xs"
            >
              <Link to={`/blog/${post.slug}`} className="block relative aspect-16/10 overflow-hidden bg-stone-50 flex items-center justify-center p-3">
                <img
                  src={post.image || "/images/ProductImages/Himalya.png"}
                  alt={post.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = "/images/ProductImages/Himalya.png";
                  }}
                />
                <span className="absolute top-4 left-4 px-3 py-1 text-xs font-semibold bg-white/95 text-[#173D2A] rounded-lg shadow-xs">
                  {post.category}
                </span>
              </Link>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {post.readTime}
                  </span>
                  <span>&bull;</span>
                  <span>{formatDate(post.date)}</span>
                </div>

                <Link to={`/blog/${post.slug}`} className="block mb-3">
                  <h2 className="font-heading tracking-tight text-xl font-bold text-[#171A17] group-hover:text-[#173D2A] transition-colors leading-snug">
                    {post.title}
                  </h2>
                </Link>

                <p className="text-xs sm:text-sm text-[#666B64] line-clamp-3 mb-6 leading-relaxed flex-1">
                  {post.excerpt}
                </p>

                <div className="pt-4 border-t border-[#E5E7DF] flex items-center justify-between">
                  <span className="text-xs text-stone-500 font-medium">By {post.author}</span>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#386B40] group-hover:text-[#173D2A]"
                  >
                    <span>Read Article</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};
