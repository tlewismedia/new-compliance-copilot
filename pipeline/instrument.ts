// Lightweight dev-time memory / size instrumentation for the query pipeline.
// Counters live on globalThis so HMR re-evaluation doesn't reset them — if
// the counters keep climbing but builds don't, we know the singleton is holding.
// If builds climb too, HMR is re-creating clients and we have an import-graph
// problem.

type Counters = {
  queryCount: number;
  graphBuildCount: number;
};

const g = globalThis as typeof globalThis & { __pipelineCounters?: Counters };
const counters: Counters = (g.__pipelineCounters ??= {
  queryCount: 0,
  graphBuildCount: 0,
});

const MB = (bytes: number): string => `${Math.round(bytes / 1024 / 1024)}MB`;

export function bumpQuery(): number {
  counters.queryCount += 1;
  return counters.queryCount;
}

export function bumpBuild(): number {
  counters.graphBuildCount += 1;
  return counters.graphBuildCount;
}

export function snapshot(): {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  queryCount: number;
  graphBuildCount: number;
} {
  const m = process.memoryUsage();
  return {
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    rss: m.rss,
    external: m.external,
    arrayBuffers: m.arrayBuffers,
    queryCount: counters.queryCount,
    graphBuildCount: counters.graphBuildCount,
  };
}

export function logMemory(tag: string, extra: Record<string, unknown> = {}): void {
  const s = snapshot();
  const parts: string[] = [
    `[mem ${tag}]`,
    `q#${s.queryCount}`,
    `builds=${s.graphBuildCount}`,
    `heap=${MB(s.heapUsed)}/${MB(s.heapTotal)}`,
    `rss=${MB(s.rss)}`,
    `ext=${MB(s.external + s.arrayBuffers)}`,
  ];
  for (const [k, v] of Object.entries(extra)) parts.push(`${k}=${v}`);
  console.log(parts.join(" "));
}
