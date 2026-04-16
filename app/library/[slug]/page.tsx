import { notFound } from "next/navigation";
import { LibraryDetailPage } from "../../Pages/LibraryDetailPage";
import { loadCorpusDoc } from "../../_lib/corpus";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const doc = loadCorpusDoc(slug);
  if (!doc) notFound();
  return <LibraryDetailPage doc={doc} />;
}
