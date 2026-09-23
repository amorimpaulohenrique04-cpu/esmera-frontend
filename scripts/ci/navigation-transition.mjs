import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const ARTIFACT_DIR = "navigation-transition-artifacts";

const ROUTE_MATRIX = [
  ["/", "/colecao"],
  ["/colecao", "/sobre"],
  ["/", "/favoritos"],
  ["/favoritos", "/colecao"],
  ["/sobre", "/termos"],
];

const VIEWPORT_MATRIX = [
  { name: "desktop", width: 1440, height: 900, hasTouch: false },
  { name: "tablet", width: 1024, height: 768, hasTouch: true },
  { name: "mobile", width: 390, height: 844, hasTouch: true },
];

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

async function installTransitionSampler(context) {
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
        // Unsupported pseudo-element inspection is handled by static contracts.
      }

      if (performance.now() - startedAt < 600) {
        requestAnimationFrame(sample);
      }
    };

    requestAnimationFrame(sample);
  });
}

async function readTransitionEvidence(page, label) {
  await page.waitForTimeout(320);

  const result = await page.evaluate(() => {
    const samples = globalThis.__esmeraTransitionSamples ?? [];
    const transitionSamples = samples.filter((sample) =>
      sample.oldName?.includes("esv-page-out") ||
      sample.newName?.includes("esv-page-in")
    );
    const overlap = transitionSamples.filter((sample) =>
      sample.oldOpacity > 0.05 && sample.newOpacity > 0.05
    );

    return {
      sampledFrames: transitionSamples.length,
      overlapFrames: overlap.length,
      hasExpectedDelay: transitionSamples.some((sample) =>
        sample.newDelay === "0.08s"
      ),
      shell: {
        mainContentCount: document.querySelectorAll("#main-content").length,
        headerCount: document.querySelectorAll(".esv-header").length,
        menuSurfaceCount: document.querySelectorAll(
          ".esv-mega-v2, .esv-nav-v2-backdrop",
        ).length,
      },
    };
  });

  invariant(
    result.sampledFrames > 0,
    `${label}: no View Transition frames were sampled`,
  );
  invariant(
    result.overlapFrames === 0,
    `${label}: old/new root snapshots overlapped in ${result.overlapFrames} frames`,
  );
  invariant(
    result.hasExpectedDelay,
    `${label}: runtime new-root delay is not 80ms`,
  );
  invariant(
    result.shell.mainContentCount === 1,
    `${label}: expected one #main-content, got ${result.shell.mainContentCount}`,
  );
  invariant(
    result.shell.headerCount === 1,
    `${label}: expected one header, got ${result.shell.headerCount}`,
  );
  invariant(
    result.shell.menuSurfaceCount === 0,
    `${label}: menu surface remained mounted after route handoff`,
  );

  return result;
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

  await installTransitionSampler(context);

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
    const transition = await readTransitionEvidence(
      page,
      "home → favoritos",
    );

    return {
      cssContract,
      ...transition,
    };
  } finally {
    await context.close();
  }
}

async function validateRouteMatrix(browser) {
  const results = [];

  for (const viewport of VIEWPORT_MATRIX) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.hasTouch,
    });
    await installTransitionSampler(context);
    const page = await context.newPage();

    try {
      for (const [from, to] of ROUTE_MATRIX) {
        await page.goto(`${BASE_URL}${from}`, {
          waitUntil: "domcontentloaded",
          timeout: 120000,
        });
        await page.waitForSelector("#main-content", { state: "attached" });

        await page.evaluate((target) => {
          globalThis.location.assign(target);
        }, `${BASE_URL}${to}`);

        await page.waitForURL(
          (url) => url.pathname === to,
          { waitUntil: "domcontentloaded", timeout: 15000 },
        );

        const label = `${viewport.name}: ${from} → ${to}`;
        const evidence = await readTransitionEvidence(page, label);
        results.push({
          viewport: viewport.name,
          from,
          to,
          ...evidence,
        });
      }
    } finally {
      await context.close();
    }
  }

  return results;
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
  routeMatrix: null,
  reducedMotion: null,
};

try {
  metrics.desktopMenu = await validateDesktopMenu(browser);
  metrics.mobileDrawer = await validateMobileDrawer(browser);
  metrics.sequentialRoot = await validateSequentialRootHandoff(browser);
  metrics.routeMatrix = await validateRouteMatrix(browser);
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
