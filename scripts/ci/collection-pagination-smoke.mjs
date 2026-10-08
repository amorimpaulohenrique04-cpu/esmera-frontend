
import { chromium } from "playwright";

const base = process.env.COLLECTION_BASE_URL || "https://www.esmeradecor.com.br";
const slug = process.env.COLLECTION_SLUG || "pecas";
const collectionUrl = `${base}/colecao/${slug}`;

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
const requests = [];
page.on("request", (req) => {
  if (req.url().includes("/api/esmera-collection")) requests.push(req.url());
});
async function snapshot(name) {
  const snap = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    pagination: [...document.querySelectorAll('nav[aria-label="Paginação da coleção"]')].map(el => ({
      text: el.innerText,
      markup: el.outerHTML.slice(0,1600),
      computedDisplay: getComputedStyle(el).display,
      visible: el.getBoundingClientRect().height > 0,
    })),
    cards: document.querySelectorAll(".esv-collection-v2-grid .esv-product-card").length,
    productIds: [...document.querySelectorAll(".esv-collection-v2-grid .esv-product-card")].map(el => el.getAttribute("data-product-id")),
    count: document.querySelector(".esv-collection-v2-count")?.textContent,
    styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(x=>x.href).filter(x=>x.includes("collection")),
    bodyHeight: document.body.scrollHeight,
  }));
  console.log(name, JSON.stringify(snap));
  await page.screenshot({ path: `/tmp/esmera-pagination-${name}.png`, fullPage: true });
  return snap;
}
try {
  const response = await page.goto(collectionUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1200);
  const initial = await snapshot("initial");
  const next = page.getByRole("link", { name: /próxima página/i }).first();
  if (await next.count()) {
    console.log("NEXT_HREF", await next.getAttribute("href"));
    await next.click({ timeout: 15000 });
    await page.waitForTimeout(800);
    const after = await snapshot("after-next");
    console.log("CHANGED_PAGE", initial.url !== after.url);
    console.log("CARD_OVERLAP", initial.productIds.filter(x=>after.productIds.includes(x)));
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await snapshot("after-back");
  }
  else console.log("NO_NEXT_LINK", { status: response?.status(), nextCount: await next.count() });
  for (const p of [1,2]) {
    try {
      const url = `${base}/api/esmera-collection?slug=${slug}&page=${p}`;
      const res = await page.request.get(url);
      const data = await res.json();
      console.log("API_PAGE", JSON.stringify({page:p,status:res.status(),count:data.items?.length,pagination:data.pagination,first:data.items?.[0]?.slug}));
    } catch(e) { console.log("API_ERROR",p,e.message); }
  }
  console.log("BROWSER_ERRORS", JSON.stringify(browserErrors));
  console.log("API_REQUESTS", JSON.stringify(requests));
} catch (error) { console.error("PROBE_FAILED", error.stack); process.exitCode = 1; }
finally { await browser.close(); }
