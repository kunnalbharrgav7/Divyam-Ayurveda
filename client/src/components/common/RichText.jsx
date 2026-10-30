import React from "react";

/**
 * Renders admin-written text without any HTML: a blank line starts a new paragraph, a single
 * newline is a line break, and **word** is bold. Everything else is shown as plain text.
 */
const renderInline = (line) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );

export const RichText = ({ text = "", className = "" }) => {
  const paragraphs = String(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;

  return paragraphs.map((paragraph, pIndex) => (
    <p key={pIndex} className={className}>
      {paragraph.split("\n").map((line, lIndex) => (
        <React.Fragment key={lIndex}>
          {lIndex > 0 && <br />}
          {renderInline(line)}
        </React.Fragment>
      ))}
    </p>
  ));
};
