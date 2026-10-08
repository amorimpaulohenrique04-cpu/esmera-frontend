// Deterministic browser regression: real CollectionExplorer + ObjectCard.
// Commercial action islands are excluded; no CMS/database credentials needed.
// npm install --no-save esbuild preact playwright && npx playwright install chromium
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../../", import.meta.url));
const bundle = await build({
  stdin: {
    contents: `import { render } from 'preact';
      import CollectionExplorer from './islands/CollectionExplorer.tsx';
      render(<CollectionExplorer {...window.fixtureProps} />, document.getElementById('app'));`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  jsxImportSource: "preact",
  plugins: [{
    name: "commercial-actions",
    setup(builder) {
      builder.onResolve({
        filter: /\/islands\/(ProductActions|WishlistButton|BuyButton)\.tsx$/,
      }, (args) => ({ path: args.path, namespace: "actions" }));
      builder.onLoad(
        { filter: /.*/, namespace: "actions" },
        () => ({
          contents: "export default function Action(){return null;}",
          loader: "js",
        }),
      );
    },
  }],
});
const health = await readFile(root + "static/esmera-card-image-health.js");
const css = await readFile(root + "static/esmera-product-card.css");
let failNext = false;
let documentReads = 0;
const requests = [];
function items(page, origin) {
  return Array.from({ length: 2 }, (_, i) => ({
    id: `${page}-${i}`,
    slug: `piece-${page}-${i}`,
    title: `Piece ${page}-${i}`,
    image: {
      id: `cover-${page}-${i}`,
      url: origin + "/broken-cover.svg",
      fullUrl: origin + `/original-cover-${page}-${i}.svg`,
    },
    hoverImage: {
      id: `hover-${page}-${i}`,
      url: origin + "/broken-hover.svg",
      fullUrl: origin + `/original-hover-${page}-${i}.svg`,
    },
    state: "available",
    purchasable: false,
  }));
}
const server = createServer((req, res) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = new URL(req.url, origin);
  const page = Number(url.searchParams.get("page") || 1);
  if (url.pathname === "/bundle.js") {
    res.setHeader("content-type", "text/javascript");
    res.end(bundle.outputFiles[0].text);
    return;
  }
  if (url.pathname === "/health.js") {
    res.setHeader("content-type", "text/javascript");
    res.end(health);
    return;
  }
  if (url.pathname === "/card.css") {
    res.setHeader("content-type", "text/css");
    res.end(css);
    return;
  }
  if (url.pathname === "/api/esmera-collection") {
    requests.push(Object.fromEntries(url.searchParams));
    if (failNext) {
      failNext = false;
      res.writeHead(503);
      res.end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        items: items(page, origin),
        pagination: { page, totalPages: 3, totalDocs: 6 },
      }),
    );
    return;
  }
  if (url.pathname === "/api/esmera-product-detail") {
    res.setHeader("content-type", "application/json");
    res.end('{"product":{"gallery":[]}}');
    return;
  }
  if (url.pathname.startsWith("/broken-")) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (url.pathname.startsWith("/original-")) {
    res.setHeader("content-type", "image/svg+xml");
    res.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="tan"/></svg>',
    );
    return;
  }
  documentReads++;
  const props = {
    initialItems: items(page, origin),
    initialTotalDocs: 6,
    initialPage: page,
    initialTotalPages: 3,
    baseHref: "/colecao",
    endpoint: "/api/esmera-collection",
    visibleFilters: ["sort"],
    categories: [],
    materials: [],
    initial: {
      q: url.searchParams.get("q") || "",
      category: "",
      materials: [],
      availability: "",
      sort: "editorial",
    },
    emptyStateTitle: "Empty",
    emptyStateCopy: "",
  };
  res.setHeader("content-type", "text/html");
  res.end(
    `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/card.css"><script>window.fixtureProps=${
      JSON.stringify(props)
    }</script><div id="app"></div><script src="/bundle.js"></script><script src="/health.js"></script>`,
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/colecao`);
  const ready = () =>
    page.waitForFunction(() =>
      [...document.querySelectorAll(".esv-product-card")].every((card) =>
        card.classList.contains("is-hover-ready") &&
        [...card.querySelectorAll("img")].every((img) => img.naturalWidth > 0)
      )
    );
  await ready();
  await page.locator(".esv-page-nav-next").first().click();
  await page.waitForFunction(() =>
    document.querySelector(".esv-collection-v2-page-nav-summary")
      ?.textContent === "Página 2 de 3"
  );
  await ready();
  assert.equal(
    await page.locator(".esv-product-card").count(),
    2,
    "Pages must replace, never append",
  );
  assert.equal(
    documentReads,
    1,
    "Page navigation should update the mounted collection",
  );
  assert.match(page.url(), /page=2/);
  await page.goBack();
  await page.waitForFunction(() =>
    document.querySelector(".esv-collection-v2-page-nav-summary")
      ?.textContent === "Página 1 de 3"
  );
  await page.goForward();
  await page.waitForFunction(() =>
    document.querySelector(".esv-collection-v2-page-nav-summary")
      ?.textContent === "Página 2 de 3"
  );
  await page.locator('input[type="search"]').fill("vaso");
  await page.waitForFunction(() =>
    document.querySelector(".esv-collection-v2-page-nav-summary")
      ?.textContent === "Página 1 de 3"
  );
  assert.match(page.url(), /q=vaso/);
  await page.locator(".esv-page-nav-next").first().click();
  await page.waitForFunction(() =>
    document.querySelector(".esv-collection-v2-page-nav-summary")
      ?.textContent === "Página 2 de 3"
  );
  assert.equal(requests.at(-1).q, "vaso");
  failNext = true;
  await page.locator(".esv-page-nav-next").first().click();
  await page.locator('[role="alert"]').waitFor();
  assert.equal(
    await page.locator('nav[aria-label*="Paginação"]').count(),
    2,
    "Both pagination controls stay mounted after an API failure",
  );
  assert.match(
    page.url(),
    /page=2/,
    "Failed requests cannot move URL ahead of products",
  );
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await page.waitForFunction(() =>
    document.querySelector(".esv-collection-v2-page-nav-summary")
      ?.textContent === "Página 3 de 3"
  );
  await ready();
  assert.equal(requests.at(-1).page, "3");
  // A previously repaired DOM node must recover again when its photo changes.
  await page.evaluate(() => {
    const image = document.querySelector(".esv-product-image-primary");
    image.setAttribute(
      "data-original-src",
      location.origin + "/original-reused.svg",
    );
    image.src = location.origin + "/broken-reused.svg";
  });
  await page.waitForFunction(() => {
    const image = document.querySelector(".esv-product-image-primary");
    return image.src.endsWith("/original-reused.svg") && image.naturalWidth > 0;
  });
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(
    "CATALOG_INTERACTION_SMOKE_PASS",
    JSON.stringify({
      pagesReplace: true,
      filtersPreserved: true,
      historyRestored: true,
      originalPhotosRecovered: true,
      retry: true,
    }),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
