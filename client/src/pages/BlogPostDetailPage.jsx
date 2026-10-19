import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, User, Calendar, ArrowLeft, Share2, Tag, BookOpen } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { EmptyState } from "../components/common/EmptyState";
import { contentService } from "../services/api";
import { formatDate } from "../utils/formatters";

export const BlogPostDetailPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const item = await contentService.getBlogPostBySlug(slug);
        setPost(item);
      } catch (err) {
        console.error("Error loading blog article:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#173D2A] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          title="Article Not Found"
          description="The educational article you requested is not available."
          actionText="Back to Blog"
          actionLink="/blog"
        />
      </div>
    );
  }

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Blog", href: "/blog" },
            { label: post.title },
          ]}
        />

        <article className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8">
          {/* Header Metadata */}
          <div className="space-y-4">
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[#173D2A]/10 text-[#173D2A] rounded-md">
              {post.category}
            </span>

            <h1 className="font-heading tracking-tight text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171A17] leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-2 border-b border-[#E5E7DF] pb-4">
              <span className="flex items-center gap-1.5 font-semibold text-[#171A17]">
                <User size={14} className="text-[#386B40]" /> {post.author}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {formatDate(post.date)}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {post.readTime}
              </span>
            </div>
          </div>

          {/* Featured Image */}
          <div className="rounded-2xl overflow-hidden aspect-16/9 bg-[#F9F9F6] border border-[#E5E7DF] flex items-center justify-center p-4 sm:p-6">
            <img
              src={post.image || "/images/ProductImages/Himalya.png"}
              alt={post.title}
              className="w-full h-full object-contain max-h-[420px]"
              onError={(e) => {
                e.target.src = "/images/ProductImages/Himalya.png";
              }}
            />
          </div>

          {/* Excerpt Lead */}
          <p className="text-base sm:text-lg text-stone-700 italic border-l-4 border-[#386B40] pl-4 font-heading tracking-tight">
            {post.excerpt}
          </p>

          {/* Body Content */}
          <div className="prose prose-stone max-w-none text-xs sm:text-sm text-[#171A17] space-y-4 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-6 border-t border-[#E5E7DF] flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                <Tag size={13} /> Tags:
              </span>
              {post.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-[#F4F4EE] rounded-lg text-xs text-stone-700 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-6 border-t border-[#E5E7DF] flex items-center justify-between">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173D2A] hover:underline"
            >
              <ArrowLeft size={14} />
              <span>Back to All Articles</span>
            </Link>

            <Link
              to="/products"
              className="px-5 py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl"
            >
              Shop Authentic Formulations
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
};
