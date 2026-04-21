// Tile asset choice: inline SVG data URI (soft repeating leaf-dot motif).
// Placeholder only — will be swapped for real artwork in a follow-up ticket.

const TILE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <g fill="#2d4a35" fill-opacity="0.6">
        <circle cx="128" cy="896" r="3" />
        <circle cx="256" cy="832" r="2" />
        <circle cx="384" cy="928" r="4" />
        <circle cx="512" cy="864" r="2" />
        <circle cx="640" cy="912" r="3" />
        <circle cx="768" cy="848" r="2" />
        <circle cx="896" cy="896" r="3" />
        <path d="M192 960 q16 -32 32 0 q-16 -8 -32 0 z" />
        <path d="M448 976 q16 -32 32 0 q-16 -8 -32 0 z" />
        <path d="M704 960 q16 -32 32 0 q-16 -8 -32 0 z" />
        <path d="M960 976 q16 -32 32 0 q-16 -8 -32 0 z" />
      </g>
    </svg>`,
  );

export function BackgroundLayers(): React.JSX.Element {
  return (
    <>
      {/* Layer 1: vertical pale-green gradient base */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          background: "linear-gradient(180deg, #eaf4ec 0%, #f3f8f2 100%)",
        }}
      />
      {/* Layer 2: upper-right soft orange → pale-green radial glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 1100px 700px at 95% -5%, rgba(253,228,212,0.55) 0%, rgba(234,244,236,0.0) 55%)",
          opacity: 0.55,
        }}
      />
      {/* Layer 3: large 1024 tile pattern, tiled horizontally across the bottom */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage: `url("${TILE_SVG}")`,
          backgroundSize: "1024px 1024px",
          backgroundPosition: "bottom center",
          backgroundRepeat: "repeat-x",
        }}
      />
    </>
  );
}
