import React from 'react';
import katex from 'katex';

export default function MathText({ text, className = '' }) {
  if (!text) return null;

  // Standartlashtirish: \[...\] -> $$...$$, \(...\) -> $...$
  const normalized = String(text)
    .replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // $$...$$ va $...$ bo'yicha ajratish
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Display math ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, {
              throwOnError: false,
              displayMode: true
            });
            return (
              <span
                key={index}
                className="my-3 block overflow-x-auto text-center text-[1.15em] font-serif"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }

        // Inline math ($...$)
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, {
              throwOnError: false,
              displayMode: false
            });
            return (
              <span
                key={index}
                className="inline-math px-1 text-[1.08em] font-serif"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
