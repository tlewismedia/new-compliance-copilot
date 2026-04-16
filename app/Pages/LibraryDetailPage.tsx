import Link from "next/link";
import { Card } from "../_components/card";
import { Markdown } from "../_components/markdown";
import { SERIF, authorityStyle, type Authority } from "../_components/shared";
import type { CorpusDoc } from "../_lib/corpus";

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function LibraryDetailPage({
  doc,
}: {
  doc: CorpusDoc;
}): React.JSX.Element {
  const style = authorityStyle(doc.authority as Authority);

  return (
    <main className="relative mx-auto w-full max-w-[1360px] flex-1 px-8 pb-24 pt-4">
      <div className="mb-6">
        <Link
          href="/library"
          aria-label="Back to Library"
          className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[11px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40 backdrop-blur-md transition-colors hover:bg-white"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M7.5 3L4.5 6L7.5 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Library
        </Link>
      </div>

      <div className="mb-6">
        <h1
          className="text-[28px] leading-tight tracking-tight text-[#1f2a23]"
          style={SERIF}
        >
          {doc.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6b7a70]">
          <span
            className={`inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-medium tracking-wide ${style.chip}`}
          >
            {style.label}
          </span>
          <span aria-hidden>·</span>
          <span>{doc.citationIdDisplay}</span>
          {doc.docType && (
            <>
              <span aria-hidden>·</span>
              <span>{doc.docType}</span>
            </>
          )}
          {doc.effectiveDate && (
            <>
              <span aria-hidden>·</span>
              <span>{doc.effectiveDate}</span>
            </>
          )}
          {isExternalUrl(doc.sourceUrl) && (
            <>
              <span aria-hidden>·</span>
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2d4a35] underline underline-offset-2 hover:text-[#1f2a23]"
              >
                Source
              </a>
            </>
          )}
        </div>
      </div>

      <Card className="p-8">
        <div className="mx-auto max-w-[720px]">
          <Markdown source={doc.body} />
        </div>
      </Card>
    </main>
  );
}
