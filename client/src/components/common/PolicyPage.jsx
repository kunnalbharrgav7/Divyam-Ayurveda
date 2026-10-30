import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { EmptyState } from "./EmptyState";
import { RichText } from "./RichText";
import { Skeleton, SkeletonRegion } from "./Skeleton";
import { contentService } from "../../services/api";

/**
 * Storefront policy page (privacy, terms, shipping, returns). The text comes from the database and is
 * edited in Admin → Content Pages; only the layout lives here.
 */
export const PolicyPage = ({ slug, icon: Icon, fallbackTitle }) => {
  const [page, setPage] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notFound | error
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus("loading");
      try {
        const result = await contentService.getContentPage(slug);
        if (cancelled) return;
        setPage(result);
        setStatus(result ? "ready" : "notFound");
      } catch (err) {
        console.error(`Error loading the "${slug}" page:`, err);
        if (!cancelled) setStatus("error");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadTick]);

  const shell = (children, crumb) => (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: crumb }]} />
        {children}
      </div>
    </div>
  );

  if (status === "loading") {
    return shell(
      <SkeletonRegion
        label="Loading page"
        className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8"
      >
        <div className="space-y-3 border-b border-[#E5E7DF] pb-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-3 w-48" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        ))}
      </SkeletonRegion>,
      fallbackTitle
    );
  }

  if (status === "error" || status === "notFound") {
    const failed = status === "error";
    return shell(
      <EmptyState
        icon={failed ? WifiOff : undefined}
        title={failed ? "We couldn't load this page" : "Page not found"}
        description={
          failed
            ? "The store didn't respond. Check your connection and try again."
            : "This page isn't available right now."
        }
        actionText={failed ? "Try again" : "Back to Home"}
        {...(failed ? { onAction: () => setReloadTick((n) => n + 1) } : { actionLink: "/" })}
      />,
      fallbackTitle
    );
  }

  return shell(
    <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8">
      <div className="space-y-2 border-b border-[#E5E7DF] pb-6">
        {page.eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center gap-1.5">
            {Icon && <Icon size={14} />} {page.eyebrow}
          </span>
        )}
        <h1 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-[#171A17]">{page.title}</h1>
        {page.updatedLabel && <p className="text-xs text-stone-500">{page.updatedLabel}</p>}
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-[#171A17] leading-relaxed">
        {page.sections?.map((section, index) => (
          <section key={index} className="space-y-2">
            <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">{section.heading}</h3>
            <RichText text={section.body} className="text-[#666B64]" />
            {section.cards?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {section.cards.map((card, cardIndex) => (
                  <div key={cardIndex} className="p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
                    {card.title && <h4 className="font-bold text-[#171A17]">{card.title}</h4>}
                    <RichText text={card.text} className="text-xs text-[#666B64] mt-1" />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>,
    page.title
  );
};
