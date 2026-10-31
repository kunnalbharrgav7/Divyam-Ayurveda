import { useEffect } from "react";

// Renders a JSON-LD block. "<" is escaped so content can never close the script tag.
export const JsonLd = ({ data }) => {
  const type = data?.["@type"];
  // The build prerenders Product JSON-LD into <head>; drop it once React renders the live copy to avoid duplicates.
  useEffect(() => {
    if (type) document.head.querySelectorAll(`script[data-prerendered="${type}"]`).forEach((el) => el.remove());
  }, [type]);

  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
};
