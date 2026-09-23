import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8000";
const ARTIFACT_DIR = "home-hygiene-artifacts";

await mkdir(ARTIFACT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const metrics = {
  baseUrl: BASE_URL,
  status: "started",
  top: null,
  transition: null,
  afterScroll: null,
};

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function readScrollState() {
  return await page.evaluate(() => {
    const picture = document.querySelector(".esv-hero-picture");
    const maisonMain = document.querySelector(".esv-maison-main");
    const maisonSecondary = document.querySelector(".esv-maison-secondary");
    return {
      scrollY: globalThis.scrollY,
      heroPictureTransform: picture
        ? getComputedStyle(picture).transform
        : null,
      maisonMainTransform: maisonMain
        ? getComputedStyle(maisonMain).transform
        : null,
      maisonSecondaryTransform: maisonSecondary
        ? getComputedStyle(maisonSecondary).transform
        : null,
      sceneHookCount: document.querySelectorAll("[data-motion-scene]").length,
    };
  });
}

try {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".esv-hero");
  await page.waitForTimeout(1200);

  const top = await page.evaluate(() => {
    const hero = document.querySelector(".esv-hero");
    const picture = document.querySelector(".esv-hero-picture");
    return {
      mainContentCount: document.querySelectorAll("#main-content").length,
      sceneHookCount: document.querySelectorAll("[data-motion-scene]").length,
      heroPictureTransform: picture
        ? getComputedStyle(picture).transform
        : null,
      heroImageTransform: document.querySelector(".esv-hero-picture img")
        ? getComputedStyle(document.querySelector(".esv-hero-picture img"))
          .transform
        : null,
      heroHeight: hero?.getBoundingClientRect().height ?? 0,
    };
  });
  metrics.top = top;

  invariant(
    top.mainContentCount === 1,
    `Expected one #main-content, got ${top.mainContentCount}`,
  );
  invariant(
    top.sceneHookCount === 0,
    `Expected zero data-motion-scene hooks, got ${top.sceneHookCount}`,
  );
  invariant(
    top.heroPictureTransform === "none",
    `Hero picture starts transformed: ${top.heroPictureTransform}`,
  );
  invariant(top.heroHeight > 0, "Hero has no measurable height");

  await page.screenshot({
    path: `${ARTIFACT_DIR}/home-top.png`,
    fullPage: false,
  });

  await page.evaluate((heroHeight) => {
    globalThis.scrollTo({
      top: Math.max(1, heroHeight * 0.88),
      left: 0,
      behavior: "instant",
    });
  }, top.heroHeight);

  // Wait for Maison to become visible and for its explicit reveal transform to
  // reach the identity matrix. This follows the animation itself instead of a
  // fixed timeout, so changing editorial duration/stagger cannot make the gate
  // sample a few milliseconds before the transition actually finishes.
  await page.waitForFunction(() =>
    [".esv-maison-main", ".esv-maison-secondary"].every((selector) => {
      const element = document.querySelector(selector);
      if (!element) return true;
      return element.classList.contains("is-visible");
    })
  );
  await page.waitForFunction(() =>
    [".esv-maison-main", ".esv-maison-secondary"].every((selector) => {
      const element = document.querySelector(selector);
      if (!element) return true;

      const animations = element.getAnimations();
      if (
        animations.some((animation) =>
          animation.playState === "running" || animation.playState === "pending"
        )
      ) {
        return false;
      }

      const style = getComputedStyle(element);
      if (Number(style.opacity) < .999999) return false;
      if (style.transform === "none") return true;

      const matrix = new DOMMatrixReadOnly(style.transform);
      return Math.abs(matrix.a - 1) < 0.0000001 &&
        Math.abs(matrix.b) < 0.0000001 &&
        Math.abs(matrix.c) < 0.0000001 &&
        Math.abs(matrix.d - 1) < 0.0000001 &&
        Math.abs(matrix.e) < 0.0000001 &&
        Math.abs(matrix.f) < 0.0000001;
    })
  );

  const transition = await readScrollState();
  metrics.transition = transition;

  invariant(
    transition.scrollY > 0,
    "Home did not scroll into the Hero → Maison transition",
  );
  invariant(
    transition.heroPictureTransform === top.heroPictureTransform,
    `Hero picture changed transform on scroll: ${top.heroPictureTransform} -> ${transition.heroPictureTransform}`,
  );
  invariant(
    transition.sceneHookCount === 0,
    "Legacy scene hooks reappeared after entering Maison",
  );

  await page.screenshot({
    path: `${ARTIFACT_DIR}/hero-to-maison-transition.png`,
    fullPage: false,
  });

  await page.evaluate(() => {
    globalThis.scrollBy({ top: 140, left: 0, behavior: "instant" });
  });
  await page.waitForTimeout(180);

  const afterScroll = await readScrollState();
  metrics.afterScroll = afterScroll;

  invariant(
    afterScroll.scrollY > transition.scrollY,
    "Second scroll did not move deeper into Maison",
  );
  invariant(
    afterScroll.heroPictureTransform === transition.heroPictureTransform,
    `Hero picture drifted after reveal settled: ${transition.heroPictureTransform} -> ${afterScroll.heroPictureTransform}`,
  );
  invariant(
    afterScroll.maisonMainTransform === transition.maisonMainTransform,
    `Maison primary media drifted after reveal settled: ${transition.maisonMainTransform} -> ${afterScroll.maisonMainTransform}`,
  );
  invariant(
    afterScroll.maisonSecondaryTransform ===
      transition.maisonSecondaryTransform,
    `Maison secondary media drifted after reveal settled: ${transition.maisonSecondaryTransform} -> ${afterScroll.maisonSecondaryTransform}`,
  );
  invariant(
    afterScroll.sceneHookCount === 0,
    "Legacy scene hooks reappeared after additional scroll",
  );

  await page.screenshot({
    path: `${ARTIFACT_DIR}/maison-after-scroll.png`,
    fullPage: false,
  });

  metrics.status = "passed";
} catch (error) {
  metrics.status = "failed";
  metrics.error = error instanceof Error
    ? error.stack || error.message
    : String(error);
  throw error;
} finally {
  await writeFile(
    `${ARTIFACT_DIR}/metrics.json`,
    `${JSON.stringify(metrics, null, 2)}\n`,
  );
  await context.close();
  await browser.close();
}
