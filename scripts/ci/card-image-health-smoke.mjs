import process from "node:process";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8000/";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});

function svg(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
  <rect width="120" height="80" fill="#e9e5dc"/>
  <text x="60" y="40" text-anchor="middle" fill="#222">${label}</text>
  </svg>`;
}

function card(slug, cover, hover) {
  return `<div class="esv-product-card${hover ? " has-detail" : ""}"
      data-product-slug="${slug}" data-product-id="${slug}">
    <figure class="esv-product-media">
      <img class="${
    hover ? "esv-product-image-primary" : "esv-product-image-static"
  }"
        src="/__card_media_test/${cover}.svg" alt="${slug}" />
      ${
    hover
      ? `<img class="esv-product-image-detail"
            src="/__card_media_test/${hover}.svg" alt="" />`
      : ""
  }
    </figure>
  </div>`;
}

function fail(reason) {
  throw new Error(reason);
}

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  let requestCount = 0;

  await page.route("**/api/media/file/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: svg("original"),
    }));
  await page.route("**/_next/image?*", (route) =>
    route.fulfill({
      status: 402,
      contentType: "text/plain",
      body: "Payment required",
    }));
  await page.route("**/__card_media_test/*", (route) => {
    requestCount++;
    const filename = new URL(route.request().url()).pathname.split("/").pop();
    if (filename?.includes("broken") || filename?.includes("fail")) {
      return route.abort("failed");
    }
    return route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: svg(filename || "OK"),
    });
  });
  await page.route("**/api/esmera-product-detail?slug=*", (route) => {
    const slug = new URL(route.request().url()).searchParams.get("slug");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        product: {
          gallery: ["cover-fails", "all-fail", "hover-recovers"].includes(slug)
            ? [{
              url: new URL(
                slug === "cover-fails" || slug === "hover-recovers"
                  ? "/__card_media_test/backup-good.svg"
                  : "/__card_media_test/also-broken.svg",
                BASE_URL,
              ).href,
            }]
            : [],
        },
      }),
    });
  });

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(
    () => globalThis.__esmeraCardImageHealthInstalled === true,
    {
      timeout: 15000,
    },
  );

  await page.evaluate(
    (content) => {
      const root = document.createElement("section");
      root.id = "esmera-card-health-smoke";
      root.innerHTML = content;
      document.body.appendChild(root);
    },
    [
      card("hover-good", "cover-good", "hover-good"),
      card("hover-fails", "cover-good", "hover-broken"),
      card("cover-fails", "cover-broken", "hover-good"),
      card("all-fail", "also-broken", "hover-broken"),
      card("hover-recovers", "cover-good", "hover-broken"),
    ].join(""),
  );

  await page.waitForFunction(() => {
    const good = document.querySelector('[data-product-slug="hover-good"]');
    const brokenHover = document.querySelector(
      '[data-product-slug="hover-fails"]',
    );
    const recovered = document.querySelector(
      '[data-product-slug="cover-fails"]',
    );
    const absent = document.querySelector('[data-product-slug="all-fail"]');
    return good?.classList.contains("is-hover-ready") &&
      !brokenHover?.classList.contains("is-hover-ready") &&
      recovered?.classList.contains("is-image-recovered") &&
      recovered?.classList.contains("is-hover-ready") &&
      Boolean(absent?.querySelector(".esv-product-card-media-placeholder")) &&
      document.querySelector('[data-product-slug="hover-recovers"]')?.classList
        .contains("is-hover-ready");
  }, { timeout: 30000 });

  const states = await page.evaluate(() => {
    return [
      "hover-good",
      "hover-fails",
      "cover-fails",
      "all-fail",
      "hover-recovers",
    ].map((slug) => {
      const card = document.querySelector(`[data-product-slug="${slug}"]`);
      const img = card?.querySelector(
        ".esv-product-image-primary, .esv-product-image-static",
      );
      const frame = card?.querySelector(".esv-product-media");
      return {
        slug,
        mainLoaded: img?.naturalWidth > 0,
        hoverReady: card?.classList.contains("is-hover-ready"),
        recovered: card?.classList.contains("is-image-recovered"),
        placeholderCount: card?.querySelectorAll(
          ".esv-product-card-media-placeholder",
        ).length,
        ratio: frame && getComputedStyle(frame).aspectRatio,
        fit: img && getComputedStyle(img).objectFit,
      };
    });
  });
  for (const state of states) {
    if (state.ratio !== "3 / 2" || state.fit !== "contain") {
      fail("Card 3:2/contain contract broken " + JSON.stringify(state));
    }
  }
  if (
    !states[0].hoverReady || states[1].hoverReady || !states[2].recovered ||
    !states[2].hoverReady || states[3].placeholderCount !== 1 ||
    !states[4].hoverReady
  ) {
    fail("Card health states incorrect " + JSON.stringify(states));
  }

  // A card appended later has to behave exactly like the first 24 cards.
  await page.evaluate((html) => {
    document.querySelector("#esmera-card-health-smoke")?.insertAdjacentHTML(
      "beforeend",
      html,
    );
  }, card("loaded-later", "cover-good", "hover-good"));
  await page.waitForFunction(
    () =>
      document.querySelector('[data-product-slug="loaded-later"]')
        ?.classList.contains("is-hover-ready"),
    { timeout: 15000 },
  );

  // A stale responsive proxy must recover both exact source photos, before
  // requesting gallery alternatives. This reproduces the published failure.
  const proxy = (filename) =>
    "/_next/image?url=" +
    encodeURIComponent("/api/media/file/" + filename + ".svg") + "&w=640&q=75";
  await page.evaluate(
    (content) => {
      const root = document.querySelector("#esmera-card-health-smoke");
      root.insertAdjacentHTML("beforeend", content);
      const images = root.querySelectorAll(
        '[data-product-slug="proxy-fails"] img',
      );
      for (const img of images) {
        img.setAttribute("srcset", img.getAttribute("src") + " 640w");
      }
    },
    card("proxy-fails", "cover-good", "hover-good")
      .replace("/__card_media_test/cover-good.svg", proxy("cover"))
      .replace("/__card_media_test/hover-good.svg", proxy("detail")),
  );
  await page.waitForFunction(() => {
    const card = document.querySelector('[data-product-slug="proxy-fails"]');
    return card?.classList.contains("is-hover-ready") &&
      [...card.querySelectorAll("img")].every((img) =>
        img.naturalWidth > 0 && img.src.includes("/api/media/file/") &&
        !img.hasAttribute("srcset")
      );
  }, { timeout: 15000 });
  await page.locator('[data-product-slug="proxy-fails"]').hover();
  await page.waitForFunction(() => {
    const card = document.querySelector('[data-product-slug="proxy-fails"]');
    return getComputedStyle(card.querySelector(".esv-product-image-primary"))
          .opacity === "0" &&
      getComputedStyle(card.querySelector(".esv-product-image-detail"))
          .opacity === "1";
  });

  const before = requestCount;
  await page.waitForTimeout(500);
  if (requestCount !== before) {
    fail("Unexpected retry loop after completing image recovery");
  }

  console.log(
    "CARD_IMAGE_HEALTH_SMOKE_PASS",
    JSON.stringify({
      states,
      dynamicallyInserted: true,
      proxyPhotosRecovered: true,
      hoverTransition: true,
      finiteRequests: requestCount,
    }),
  );
} finally {
  await browser.close();
}
