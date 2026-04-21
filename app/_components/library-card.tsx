import Link from "next/link";
import { Card } from "./card";
import { LOGO_FONT, authorityStyle, type Authority } from "./shared";
import type { CorpusDoc } from "../_lib/corpus";

const SNIPPET_MAX_CHARS = 180;

function snippetFromBody(body: string): string {
  // Strip leading heading markers and collapse whitespace so the snippet
  // reads like prose regardless of where the body starts.
  const cleaned = body
    .replace(/^\s*#{1,6}\s+.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= SNIPPET_MAX_CHARS) return cleaned;
  return cleaned.slice(0, SNIPPET_MAX_CHARS).trimEnd() + "…";
}

export function LibraryCard({ doc }: { doc: CorpusDoc }): React.JSX.Element {
  const style = authorityStyle(doc.authority as Authority);
  const snippet = snippetFromBody(doc.body);
  const footerDate = doc.effectiveDate;
  const footerType = doc.docType;

  return (
    <Link
      href={`/library/${doc.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9cc9a9] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
    >
      <Card className="flex h-full flex-col p-5 transition-colors group-hover:bg-white/90">
        <div className="flex items-start justify-between gap-3">
          <span
            className="text-[10px] uppercase tracking-[0.18em] text-[#6b7a70]"
          >
            {doc.citationIdDisplay}
          </span>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-[2px] text-[10px] font-medium tracking-wide ${style.chip}`}
          >
            {style.label}
          </span>
        </div>

        <h2
          className="mt-2 line-clamp-2 text-[16px] leading-snug tracking-tight text-[#1f2a23]"
          style={LOGO_FONT}
        >
          {doc.title}
        </h2>

        <p className="mt-3 flex-1 text-[12.5px] leading-[1.55] text-[#435048]">
          {snippet}
        </p>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-[#6b7a70]">
          {footerType && <span>{footerType}</span>}
          {footerType && footerDate && <span aria-hidden>·</span>}
          {footerDate && <span>{footerDate}</span>}
        </div>
      </Card>
    </Link>
  );
}
