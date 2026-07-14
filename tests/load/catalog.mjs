// Dependency-free catalog capacity check. Run against a production build, never a live deployment.
const url = process.env.LOAD_URL ?? "http://localhost:4820/api/marketplace?pageSize=12";
const total = positiveInt("LOAD_TOTAL", 10_000);
const concurrency = positiveInt("LOAD_CONCURRENCY", 100);
const maxP95 = positiveInt("LOAD_MAX_P95_MS", 500);

function positiveInt(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

// Warm the application, connection pools, and route compilation before measuring.
for (let i = 0; i < Math.min(100, total); i++) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Warmup failed with HTTP ${response.status}`);
  await response.arrayBuffer();
}

let next = 0;
let errors = 0;
let bytes = 0;
const latencies = Array(total);
const started = performance.now();

async function worker() {
  while (true) {
    const id = next++;
    if (id >= total) return;
    const requestStarted = performance.now();
    try {
      const response = await fetch(url);
      const body = await response.arrayBuffer();
      bytes += body.byteLength;
      if (!response.ok) errors++;
    } catch {
      errors++;
    }
    latencies[id] = performance.now() - requestStarted;
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
const elapsed = performance.now() - started;
latencies.sort((a, b) => a - b);
const percentile = (value) =>
  latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))];
const result = {
  url,
  total,
  concurrency,
  errors,
  durationSeconds: +(elapsed / 1000).toFixed(2),
  requestsPerSecond: +(total / (elapsed / 1000)).toFixed(1),
  transferredMB: +(bytes / 1_000_000).toFixed(1),
  latencyMs: {
    p50: +percentile(0.5).toFixed(1),
    p95: +percentile(0.95).toFixed(1),
    p99: +percentile(0.99).toFixed(1),
    max: +latencies.at(-1).toFixed(1),
  },
};
console.log(JSON.stringify(result, null, 2));

if (errors > 0 || result.latencyMs.p95 > maxP95) {
  console.error(
    `Capacity check failed: errors=${errors}, p95=${result.latencyMs.p95}ms (limit ${maxP95}ms)`,
  );
  process.exit(1);
}
