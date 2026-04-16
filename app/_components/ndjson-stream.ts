/**
 * Minimal NDJSON stream reader. POSTs to `url`, reads the response body as a
 * stream, and calls `onLine` for each parsed JSON object as it arrives.
 * Returns once the server closes the stream. Throws on HTTP errors or if
 * the stream is aborted via the supplied signal.
 */
export async function streamNdjson(
  url: string,
  onLine: (obj: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal,
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // non-JSON body — keep the default message.
    }
    throw new Error(message);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // NDJSON: split on newline, keep the trailing partial line in buffer.
    let nl = buffer.indexOf("\n");
    while (nl !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.length > 0) {
        try {
          onLine(JSON.parse(line));
        } catch {
          // Skip malformed lines — server shouldn't emit them, but we'd
          // rather drop one item than abort the whole stream.
        }
      }
      nl = buffer.indexOf("\n");
    }
  }

  // Flush any final partial (unterminated) line.
  const tail = buffer.trim();
  if (tail.length > 0) {
    try {
      onLine(JSON.parse(tail));
    } catch {
      // ignore
    }
  }
}
