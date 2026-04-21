import { LOGO_FONT } from "../_components/shared";
import { LibraryCard } from "../_components/library-card";
import { loadCorpusDocs } from "../_lib/corpus";

export function LibraryPage(): React.JSX.Element {
  const docs = loadCorpusDocs();

  return (
    <main className="relative mx-auto w-full max-w-[1360px] flex-1 px-8 pb-24 pt-4">
      <div className="mb-6">
        <h1
          className="text-[28px] tracking-tight text-[#1f2a23]"
          style={LOGO_FONT}
        >
          Library
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7a70]">
          Indexed sources, authorities, and document versions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <LibraryCard key={doc.slug} doc={doc} />
        ))}
      </div>
    </main>
  );
}
