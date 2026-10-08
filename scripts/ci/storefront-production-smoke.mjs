import process from "node:process";
// Real Fresh/Deco pages and CMS data; no substituted layout or commercial islands.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.STOREFRONT_URL || "http://127.0.0.1:8000";
const evidence = "smoke-artifacts/production-flow";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (
    const viewport of [{ width: 1366, height: 900 }, {
      width: 390,
      height: 844,
    }]
  ) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (
      const route of [
        "/",
        "/colecao",
        "/colecao?page=3",
        "/colecao/pecas",
        "/colecao/kits",
        "/pagina/a-esmera",
      ]
    ) {
      const response = await page.goto(base + route, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      assert.equal(response.status(), 200, route);
      await page.waitForTimeout(500);
      const proxies = await page.locator("img").evaluateAll((images) =>
        images.map((i) => i.currentSrc || i.src).filter((src) =>
          src.includes("esmeracms") && src.includes("/_next/image")
        )
      );
      assert.deepEqual(
        proxies,
        [],
        "CMS images must be independent of optimization quota",
      );
      for (
        let y = 0;
        y < await page.evaluate(() => document.documentElement.scrollHeight);
        y += viewport.height * .7
      ) {
        await page.evaluate((y) => globalThis.scrollTo(0, y), y);
        await page.waitForTimeout(200);
      }
      await page.waitForFunction(
        () => [...document.images].every((i) => i.complete),
        { timeout: 30000 },
      );
      const broken = await page.locator("img").evaluateAll((images) =>
        images.filter((i) => i.naturalWidth === 0).map((i) => ({
          alt: i.alt,
          src: i.currentSrc || i.src,
        }))
      );
      report.push({ viewport, route, broken });
      await page.screenshot({
        path: `${evidence}/${viewport.width}-${
          route.replace(/[^a-z0-9]/gi, "_") || "home"
        }.png`,
      });
      assert.deepEqual(broken, [], `Broken media on ${route}`);
      if (route === "/colecao") {
        assert.equal(
          await page.locator('nav[aria-label*="Paginação"]').count(),
          2,
        );
        await page.getByRole("link", {
          name: "Ir para a página 2",
          exact: true,
        }).first().click();
        await page.waitForURL(/page=2/);
        await page.getByRole("link", {
          name: "Ir para a página 1",
          exact: true,
        }).first().click();
        await page.waitForURL((url) => !url.searchParams.has("page"));
      }
    }
    assert.deepEqual(errors, [], "Uncaught page errors");
    await context.close();
  }
  const cookieContext = await browser.newContext({
    extraHTTPHeaders: { cookie: "=bad; valid=test" },
  });
  const cookiePage = await cookieContext.newPage();
  assert.equal(
    (await cookiePage.goto(base + "/")).status(),
    200,
    "Malformed cookies must not cause HTTP 500",
  );
  await cookieContext.close();
} finally {
  await writeFile(`${evidence}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  "Full storefront pages: desktop, mobile, pagination and malformed cookies passed",
);
