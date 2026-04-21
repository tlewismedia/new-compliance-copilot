import { LOGO_FONT } from "./shared";

/**
 * Minimal server-side markdown renderer.
 *
 * The corpus body is mostly prose with occasional headings. Rather than
 * pulling in `react-markdown` and its plugin chain, we split on blank lines
 * and match headings at the block start. Anything else is emitted as a
 * paragraph preserving whitespace. Bullets, bold, italics, and inline links
 * render as literal text — acceptable for this browse surface.
 */
export function Markdown({ source }: { source: string }): React.JSX.Element {
  const blocks = source.split(/\n\s*\n/).map((b) => b.replace(/^\n+|\n+$/g, ""));

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.length === 0) return null;

        if (block.startsWith("# ")) {
          return (
            <h1
              key={i}
              className="mt-2 text-[26px] leading-tight tracking-tight text-[#1f2a23]"
              style={LOGO_FONT}
            >
              {block.slice(2)}
            </h1>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="mb-2 mt-6 text-[20px] leading-tight tracking-tight text-[#1f2a23]"
              style={LOGO_FONT}
            >
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith("### ")) {
          return (
            <h3
              key={i}
              className="mb-2 mt-6 text-[13px] font-semibold tracking-wide text-[#2d4a35]"
            >
              {block.slice(4)}
            </h3>
          );
        }

        return (
          <p
            key={i}
            className="whitespace-pre-wrap text-[14.5px] leading-[1.75] text-[#26302a]"
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}
