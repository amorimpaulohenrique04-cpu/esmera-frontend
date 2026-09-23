import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const ARTIFACT_DIR = "navigation-transition-artifacts";

await mkdir(ARTIFACT_DIR, { recursive: true });

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sameTarget(requestUrl, targetUrl) {
  const request = new URL(requestUrl);
  const target = new URL(targetUrl);
  return request.origin === target.origin &&
    request.pathname === target.pathname &&
    request.search === target.search;
}

async function firstDifferentInternalHref(page, selector) {
  return await page.evaluate((candidateSelector) => {
    const current = new URL(globalThis.location.href);
    const anchors = Array.from(
      document.querySelectorAll(candidateSelector),
    ).filter((node) => node instanceof HTMLAnchorElement);

    for (const anchor of anchors) {
      if (anchor.hasAttribute("download")) continue;
      if (anchor.target && anchor.target !== "_self") continue;
      const url = new URL(anchor.href, current.href);
      if (url.origin !== current.origin) continue;
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      if (
        url.pathname === current.pathname &&
        url.search === current.search
      ) continue;
      return url.href;
    }

    return null;
  }, selector);
}

async function dispatchTrackedNavigation(page, targetHref, surfaceSelector) {
  let requestAt = null;
  const onRequest = (request) => {
    if (
      request.isNavigationRequest() &&
      request.frame() === page.mainFrame() &&
      sameTarget(request.url(), targetHref)
    ) {
      requestAt ??= Date.now();
    }
  };

  page.on("request", onRequest);
  const clickAt = Date.now();

  const closingState = await page.evaluate(
    async ({ targetHref, surfaceSelector }) => {
      const anchor = Array.from(
        document.querySelectorAll("a[href]"),
      ).find((candidate) =>
        candidate instanceof HTMLAnchorElement &&
        candidate.href === targetHref
      );
      if (!(anchor instanceof HTMLAnchorElement)) {
        throw new Error(`Navigation target not found: ${targetHref}`);
      }

      anchor.click();
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      const surface = document.querySelector(surfaceSelector);
      return {
        href: globalThis.location.href,
        closing: surface?.classList.contains("is-closing") ?? false,
      };
    },
    { targetHref, surfaceSelector },
  );

  invariant(
    closingState.closing,
    `Expected ${surfaceSelector} to enter closing before navigation`,
  );
  invariant(
    !sameTarget(closingState.href, targetHref),
    "Navigation committed before the menu exit lifecycle completed",
  );

  await page.waitForURL(
    (url) => sameTarget(url.href, targetHref),
    { timeout: 15000, waitUntil: "domcontentloaded" },
  );
  page.off("request", onRequest);

  invariant(requestAt !== null, "Navigation request timestamp was not captured");
  const delayMs = requestAt - clickAt;
  invariant(
    delayMs >= 100,
    `Navigation request started too early: ${delayMs}ms`,
  );

  return delayMs;
}

async function validateDesktopMenu(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForSelector(".esv-header", { state: "visible" });
    const trigger = page.locator(
      '.esv-nav-v2-root-link[aria-haspopup="true"]',
    ).first();
    await trigger.waitFor({ state: "visible" });
    await trigger.hover();
    await page.waitForSelector(".esv-mega-v2", {
      state: "visible",
      timeout: 5000,
    });

    const targetHref = await firstDifferentInternalHref(
      page,
      ".esv-mega-v2 a[href]",
    );
    invariant(targetHref, "No internal mega-menu navigation target found");

    const delayMs = await dispatchTrackedNavigation(
      page,
      targetHref,
      ".esv-mega-v2",
    );

    return { targetHref, delayMs };
  } finally {
    await context.close();
  }
}

async function validateMobileDrawer(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForSelector(".esv-header", { state: "visible" });
    await page.locator(".esv-nav-v2-mobile-trigger").click();
    await page.waitForSelector(".esv-nav-v2-backdrop", {
      state: "visible",
      timeout: 5000,
    });

    const targetHref = await firstDifferentInternalHref(
      page,
      ".esv-nav-v2-drawer a[href]",
    );
    invariant(targetHref, "No internal drawer navigation target found");

    const delayMs = await dispatchTrackedNavigation(
      page,
      targetHref,
      ".esv-nav-v2-backdrop",
    );

    return { targetHref, delayMs };
  } finally {
    await context.close();
  }
}

async function validateSequentialRootHandoff(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    globalThis.__esmeraTransitionSamples = [];
    const startedAt = performance.now();

    const sample = () => {
      if (!document.documentElement) {
        requestAnimationFrame(sample);
        return;
      }

      try {
        const oldStyle = getComputedStyle(
          document.documentElement,
          "::view-transition-old(root)",
        );
        const newStyle = getComputedStyle(
          document.documentElement,
          "::view-transition-new(root)",
        );

        globalThis.__esmeraTransitionSamples.push({
          t: performance.now() - startedAt,
          oldName: oldStyle.animationName,
          newName: newStyle.animationName,
          oldOpacity: Number(oldStyle.opacity),
          newOpacity: Number(newStyle.opacity),
          newDelay: newStyle.animationDelay,
          oldDuration: oldStyle.animationDuration,
          newDuration: newStyle.animationDuration,
        });
      } catch {
        // Browsers without the pseudo-element computed-style surface fall back
        // to the static runtime CSS contract checked below.
      }

      if (performance.now() - startedAt < 600) {
        requestAnimationFrame(sample);
      }
    };

    requestAnimationFrame(sample);
  });

  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForSelector(".esv-header", { state: "visible" });
    const motionHref = await page.locator(
      'link[href*="esmera-motion-v2.css"]',
    ).getAttribute("href");
    invariant(motionHref, "Motion stylesheet is not linked");

    const cssContract = await page.evaluate(async (href) => {
      const css = await fetch(href).then((response) => response.text());
      return {
        hasRootOld: css.includes("::view-transition-old(root)"),
        hasRootNew: css.includes("::view-transition-new(root)"),
        hasNamedMain: css.includes("esmera-main") ||
          css.includes("view-transition-name"),
        hasExit80: css.includes("--motion-page-exit: 80ms"),
        hasEnter160: css.includes("--motion-page-enter: 160ms"),
        hasDelayedNew: /::view-transition-new\(root\)[\s\S]*?var\(--motion-page-exit\) both;/
          .test(css),
      };
    }, motionHref);

    invariant(cssContract.hasRootOld, "Old root snapshot contract missing");
    invariant(cssContract.hasRootNew, "New root snapshot contract missing");
    invariant(!cssContract.hasNamedMain, "Named main snapshot reappeared");
    invariant(cssContract.hasExit80, "80ms route exit token missing");
    invariant(cssContract.hasEnter160, "160ms route enter token missing");
    invariant(
      cssContract.hasDelayedNew,
      "New document is not delayed until the old document exits",
    );

    await page.locator(".esv-wishlist-header-link").click();
    await page.waitForURL("**/favoritos", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(320);

    const samples = await page.evaluate(() =>
      globalThis.__esmeraTransitionSamples ?? []
    );
    const transitionSamples = samples.filter((sample) =>
      sample.oldName?.includes("esv-page-out") ||
      sample.newName?.includes("esv-page-in")
    );

    if (transitionSamples.length > 0) {
      const overlap = transitionSamples.filter((sample) =>
        sample.oldOpacity > 0.05 && sample.newOpacity > 0.05
      );
      invariant(
        overlap.length === 0,
        `Old/new root snapshots overlapped in ${overlap.length} sampled frames`,
      );

      invariant(
        transitionSamples.some((sample) => sample.newDelay === "0.08s"),
        "Runtime new-root delay is not 80ms",
      );
    }

    return {
      cssContract,
      sampledFrames: transitionSamples.length,
      overlapFrames: transitionSamples.filter((sample) =>
        sample.oldOpacity > 0.05 && sample.newOpacity > 0.05
      ).length,
    };
  } finally {
    await context.close();
  }
}

async function validateReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForSelector(".esv-header", { state: "visible" });
    const state = await page.evaluate(() => ({
      matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
      rootAnimation: getComputedStyle(
        document.documentElement,
        "::view-transition-group(root)",
      ).animationName,
      oldAnimation: getComputedStyle(
        document.documentElement,
        "::view-transition-old(root)",
      ).animationName,
      newAnimation: getComputedStyle(
        document.documentElement,
        "::view-transition-new(root)",
      ).animationName,
    }));

    invariant(state.matches, "Reduced-motion media query is not active");
    invariant(
      [state.rootAnimation, state.oldAnimation, state.newAnimation].every(
        (name) => name === "none",
      ),
      `View-transition animation still active in reduced motion: ${
        JSON.stringify(state)
      }`,
    );

    return state;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
const metrics = {
  baseUrl: BASE_URL,
  status: "started",
  desktopMenu: null,
  mobileDrawer: null,
  sequentialRoot: null,
  reducedMotion: null,
};

try {
  metrics.desktopMenu = await validateDesktopMenu(browser);
  metrics.mobileDrawer = await validateMobileDrawer(browser);
  metrics.sequentialRoot = await validateSequentialRootHandoff(browser);
  metrics.reducedMotion = await validateReducedMotion(browser);
  metrics.status = "passed";
  console.log("Navigation transition validation passed");
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
  await browser.close();
}
