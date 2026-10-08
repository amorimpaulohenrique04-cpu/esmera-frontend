import process from "node:process";
import { writeFile } from "node:fs/promises";

const CMS = process.env.PAYLOAD_API_URL || "https://esmeracms-green.vercel.app";
const REV = "original-fallback-v4-20261008";
const LIMIT = 24;
const TIMEOUT_MS = 14000;

async function request(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "image/avif,image/webp,image/jpeg,image/png,*/*" },
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "";
    const status = response.status;
    const errorCode = response.headers.get("x-vercel-error") || undefined;
    // Do not download all images; the response header plus the first bytes
    // distinguish a JPEG/PNG/WebP response from HTML/error pages.
    let magic = "";
    if (response.body) {
      const reader = response.body.getReader();
      const first = await reader.read();
      const bytes = first.value || new Uint8Array();
      magic = [...bytes.slice(0, 12)].map((b) =>
        b.toString(16).padStart(2, "0")
      ).join("");
      await reader.cancel();
    }
    const jpeg = magic.startsWith("ffd8ff");
    const png = magic.startsWith("89504e470d0a1a0a");
    const gif = magic.startsWith("47494638");
    const webp = magic.slice(16, 24) === "57454250";
    const avif = magic.includes("6674797061766966");
    const valid = status === 200 && contentType.startsWith("image/") &&
      (jpeg || png || gif || webp || avif);
    return { status, contentType, valid, errorCode, magic };
  } catch (error) {
    return {
      status: 0,
      contentType: "",
      valid: false,
      error: String(error).slice(0, 180),
    };
  }
}

async function pool(items, fn, concurrency = 8) {
  let next = 0;
  const result = new Array(items.length);
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < items.length) {
      const index = next++;
      result[index] = await fn(items[index], index);
    }
  }));
  return result;
}

const products = [];
let totalPages = 1;
for (let page = 1; page <= totalPages; page++) {
  const url = new URL("/api/storefront/products", CMS);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("_cardMedia", REV);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Catalog page ${page} HTTP ${response.status}`);
  }
  const data = await response.json();
  totalPages = data.pagination?.totalPages || 1;
  products.push(...data.items.map((p) => ({
    page,
    slug: p.slug,
    title: p.title,
    cover: p.image?.url || null,
    hover: p.hoverImage?.url || null,
  })));
}

const uniqueSources = [
  ...new Set(products.flatMap((p) => [p.cover, p.hover].filter(Boolean))),
];
const audits = await pool(uniqueSources, async (url) => {
  const source = await request(url);
  const original = new URL(url);
  const optimized = new URL("/_next/image", original.origin);
  optimized.searchParams.set("url", original.pathname + original.search);
  optimized.searchParams.set("w", "640");
  optimized.searchParams.set("q", "75");
  const next = process.env.AUDIT_OPTIMIZER === "true"
    ? await request(optimized.toString())
    : { valid: true, status: "not-used", contentType: "", errorCode: "" };
  return { url, source, optimized: next };
});
const byURL = new Map(audits.map((item) => [item.url, item]));
const rows = products.map((p) => ({
  page: p.page,
  slug: p.slug,
  title: p.title,
  cover: p.cover ? byURL.get(p.cover) : null,
  hover: p.hover ? byURL.get(p.hover) : null,
}));
const defective = rows.filter((p) =>
  (p.cover && !p.cover.source.valid) || (p.hover && !p.hover.source.valid)
);
const optimizedBad = audits.filter((a) => !a.optimized.valid);
const sourceBad = audits.filter((a) => !a.source.valid);

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    products: products.length,
    pages: totalPages,
    covers: products.filter((x) => x.cover).length,
    hovers: products.filter((x) => x.hover).length,
    uniqueSources: audits.length,
    sourceFailures: sourceBad.length,
    optimizerFailures: optimizedBad.length,
    affectedProducts: defective.length,
  },
  sourceFailures: sourceBad,
  optimizerStatusCounts: Object.entries(
    Object.groupBy(
      audits,
      (a) =>
        `${a.optimized.status} ${a.optimized.contentType} ${
          a.optimized.errorCode || ""
        }`,
    ),
  ).map(([status, entries]) => ({ status, count: entries.length })),
  affectedProducts: defective,
  audit: rows,
};
await writeFile("catalog-media-audit.json", JSON.stringify(report, null, 2));
console.log("CATALOG_MEDIA_AUDIT_SUMMARY " + JSON.stringify(report.totals));
console.log(
  "OPTIMIZER_STATUS_COUNTS " + JSON.stringify(report.optimizerStatusCounts),
);
for (const row of defective) {
  console.log(
    "BROKEN_PRODUCT " + JSON.stringify({
      page: row.page,
      slug: row.slug,
      cover: row.cover?.source,
      hover: row.hover?.source,
    }),
  );
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "## Esméra — mídia dos cards",
      `- Produtos: ${products.length} em ${totalPages} páginas`,
      `- URLs originais distintas: ${audits.length}`,
      `- Originais inválidos: ${sourceBad.length}`,
      `- Respostas inválidas do otimizador: ${optimizedBad.length}`,
      `- Produtos com arquivos de capa/hover inválidos: ${defective.length}`,
      "",
      "O relatório completo, incluindo HTTP, Content-Type e magic bytes, está no artefato JSON.",
    ].join("\n") + "\n",
  );
}
if (products.length === 0 || sourceBad.length > 0) process.exitCode = 2;
