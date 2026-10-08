import process from "node:process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8000/";
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "media-fidelity-artifacts";
const metrics = { scenarios: [], status: "running" };

await mkdir(ARTIFACT_DIR, { recursive: true });

function markedSvg(label, width, height, tone, full = false) {
  const border = Math.max(10, Math.round(Math.min(width, height) * 0.025));
  const marker = Math.max(18, Math.round(Math.min(width, height) * 0.055));
  const suffix = full ? " FULL" : " WIDE";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${tone}"/>
    <rect x="${border / 2}" y="${border / 2}" width="${
      width - border
    }" height="${
      height - border
    }" fill="none" stroke="#111210" stroke-width="${border}"/>
    <circle cx="${marker}" cy="${marker}" r="${marker / 2}" fill="#111210"/>
    <circle cx="${width - marker}" cy="${marker}" r="${
      marker / 2
    }" fill="#111210"/>
    <circle cx="${marker}" cy="${height - marker}" r="${
      marker / 2
    }" fill="#111210"/>
    <circle cx="${width - marker}" cy="${height - marker}" r="${
      marker / 2
    }" fill="#111210"/>
    <text x="${width / 2}" y="${
      height / 2
    }" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${
      Math.max(28, Math.min(width, height) / 10)
    }" fill="#111210">${label}${suffix}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const palette = ["#d9d3c8", "#c8c0b3", "#b8b2a8", "#a9a49a", "#e9e5dc"];

function media(index, label, width, height, role) {
  return {
    url: markedSvg(label, width, height, palette[(index - 1) % palette.length]),
    fullUrl: markedSvg(
      label,
      width * 2,
      height * 2,
      palette[(index - 1) % palette.length],
      true,
    ),
    alt: `${label} completa`,
    key: `fixture-${index}`,
    role,
    width,
    height,
    fullWidth: width * 2,
    fullHeight: height * 2,
  };
}

function product(name, medias) {
  const cover = medias[0];
  const detail = medias.find((item) =>
    item.role === "detail" && item.url !== cover.url
  );
  return {
    id: `fidelity-${name}`,
    slug: `fidelity-${name}`,
    code: `FID-${name}`,
    title: `Fidelity ${name}`,
    image: cover.url,
    alt: cover.alt,
    detailImage: detail?.url,
    availability: "available",
    material: "Pedra natural",
    gallery: medias,
    attributes: [],
    priceMode: "fixed",
    priceCents: 120000,
    formattedPrice: "R$ 1.200,00",
    isInquiry: false,
    variants: [],
    seo: { title: `Fidelity ${name}`, description: "", noindex: false },
    price: "R$ 1.200,00",
  };
}

const fixtures = {
  singleLandscape: product("single-landscape", [
    media(1, "16:9", 1600, 900, "cover"),
  ]),
  twoPortrait: product("two-portrait", [
    media(1, "4:5 A", 900, 1125, "cover"),
    media(2, "4:5 B", 900, 1125, "detail"),
  ]),
  twoMixed: product("two-mixed", [
    media(1, "4:5", 900, 1125, "cover"),
    media(2, "16:9", 1600, 900, "detail"),
  ]),
  threeMixed: product("three-mixed", [
    media(1, "1:1", 1000, 1000, "cover"),
    media(2, "1:2", 800, 1600, "detail"),
    media(3, "2:1", 1800, 900, "context"),
  ]),
};

function fail(message, data) {
  throw new Error(`${message}${data ? `: ${JSON.stringify(data)}` : ""}`);
}

async function openFixture(page, fixture) {
  if (await page.locator(".esv-product-viewer").count()) {
    await page.keyboard.press("Escape");
  }
  if (await page.locator(".esv-product-modal").count()) {
    await page.keyboard.press("Escape");
    await page.waitForSelector(".esv-product-modal", { state: "detached" });
  }
  await page.evaluate((value) => {
    globalThis.dispatchEvent(
      new CustomEvent("esmera:open-product", { detail: { product: value } }),
    );
  }, fixture);
  await page.waitForSelector(".esv-product-modal", { state: "visible" });
  await page.waitForFunction(() => {
    const images = Array.from(
      document.querySelectorAll(".esv-product-modal-gallery img"),
    );
    return images.length > 0 &&
      images.every((image) =>
        image instanceof HTMLImageElement && image.complete &&
        image.naturalWidth > 0
      );
  });
  await page.waitForTimeout(360);
}

async function imageGeometry(locator, containerSelector) {
  return await locator.evaluate((image, selector) => {
    if (!(image instanceof HTMLImageElement)) throw new Error("Expected image");
    const container = image.closest(selector);
    if (!(container instanceof HTMLElement)) {
      throw new Error(`Missing ${selector}`);
    }
    const rect = image.getBoundingClientRect();
    const parent = container.getBoundingClientRect();
    const objectFit = getComputedStyle(image).objectFit;
    const naturalAspect = image.naturalWidth / image.naturalHeight;
    let contentWidth = rect.width;
    let contentHeight = rect.height;
    if (objectFit === "contain" && rect.width > 0 && rect.height > 0) {
      if (naturalAspect > rect.width / rect.height) {
        contentHeight = rect.width / naturalAspect;
      } else {
        contentWidth = rect.height * naturalAspect;
      }
    }
    const left = rect.left + (rect.width - contentWidth) / 2;
    const top = rect.top + (rect.height - contentHeight) / 2;
    return {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      naturalAspect,
      renderedWidth: contentWidth,
      renderedHeight: contentHeight,
      renderedAspect: contentWidth / contentHeight,
      image: {
        left,
        top,
        right: left + contentWidth,
        bottom: top + contentHeight,
      },
      container: {
        left: parent.left,
        top: parent.top,
        right: parent.right,
        bottom: parent.bottom,
      },
      objectFit,
      src: image.currentSrc || image.src,
    };
  }, containerSelector);
}

function assertComplete(geometry, label) {
  if (geometry.renderedWidth <= 0 || geometry.renderedHeight <= 0) {
    fail(`${label} has zero rendered size`, geometry);
  }
  if (Math.abs(geometry.naturalAspect - geometry.renderedAspect) > 0.025) {
    fail(`${label} changed aspect ratio`, geometry);
  }
  const tolerance = 2;
  if (
    geometry.image.left < geometry.container.left - tolerance ||
    geometry.image.top < geometry.container.top - tolerance ||
    geometry.image.right > geometry.container.right + tolerance ||
    geometry.image.bottom > geometry.container.bottom + tolerance
  ) {
    fail(`${label} escapes/crops outside its stage`, geometry);
  }
  if (geometry.objectFit !== "contain") {
    fail(`${label} is not contained`, geometry);
  }
}

function recordScenario(name, data) {
  metrics.scenarios.push({ name, ...data });
}

const browser = await chromium.launch({ headless: true });
try {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktop = await desktopContext.newPage();
  await desktop.goto(BASE_URL, { waitUntil: "networkidle", timeout: 120000 });

  // Read the current cache-bust token from source instead of pinning a
  // historical literal here — a hardcoded value drifts every time
  // storefrontStyleRevision is bumped and silently stops guarding anything.
  const appSource = await readFile("routes/_app.tsx", "utf8");
  const expectedRevision = appSource.match(
    /storefrontStyleRevision\s*=\s*"([^"]+)"/,
  )?.[1];
  if (!expectedRevision) {
    fail("Could not read storefrontStyleRevision from routes/_app.tsx");
  }

  const cssHref = await desktop.locator(
    'link[href*="esmera-product-modal.css"]',
  ).getAttribute("href");
  if (!cssHref?.includes(expectedRevision)) {
    fail("Media fidelity stylesheet revision is stale", {
      cssHref,
      expectedRevision,
    });
  }

  const desktopFrame = desktop.locator(
    ".esv-product-modal-gallery-frame.is-desktop",
  );

  await openFixture(desktop, fixtures.singleLandscape);
  const singleClass = await desktopFrame.locator(".esv-product-modal-slide")
    .first().getAttribute("class");
  if (!singleClass?.includes("is-single")) {
    fail("Single image mode missing", { singleClass });
  }
  const singleGeometry = await imageGeometry(
    desktopFrame.locator(".esv-product-modal-gallery img").first(),
    ".esv-product-modal-image",
  );
  assertComplete(singleGeometry, "single landscape");
  await desktop.screenshot({
    path: `${ARTIFACT_DIR}/desktop-single-landscape.png`,
  });
  await recordScenario("desktop-single-landscape", singleGeometry);

  await openFixture(desktop, fixtures.twoPortrait);
  const splitClass = await desktopFrame.locator(".esv-product-modal-slide")
    .first().getAttribute("class");
  if (!splitClass?.includes("is-pair")) {
    fail("Compatible portraits did not keep split", { splitClass });
  }
  const splitImages = desktopFrame.locator(".esv-product-modal-gallery img");
  for (let index = 0; index < 2; index++) {
    assertComplete(
      await imageGeometry(splitImages.nth(index), ".esv-product-modal-image"),
      `split portrait ${index + 1}`,
    );
  }
  await desktop.screenshot({
    path: `${ARTIFACT_DIR}/desktop-two-portrait-split.png`,
  });
  await recordScenario("desktop-two-portrait-split", {
    presentation: splitClass,
  });

  await openFixture(desktop, fixtures.twoMixed);
  const mixedSlides = desktopFrame.locator(".esv-product-modal-slide");
  if (await mixedSlides.count() !== 2) {
    fail("Mixed ratios did not keep two stages");
  }
  const mixedFirstClass = await mixedSlides.nth(0).getAttribute("class");
  const mixedSecondClass = await mixedSlides.nth(1).getAttribute("class");
  if (
    !mixedFirstClass?.includes("is-mounted") ||
    !mixedSecondClass?.includes("is-single")
  ) {
    fail("Mixed ratios produced the wrong stages", {
      mixedFirstClass,
      mixedSecondClass,
    });
  }
  assertComplete(
    await imageGeometry(
      desktopFrame.locator(".esv-product-modal-slide.is-active img").first(),
      ".esv-product-modal-image",
    ),
    "mixed active portrait",
  );
  await desktop.screenshot({
    path: `${ARTIFACT_DIR}/desktop-two-mixed-stage-1.png`,
  });
  await desktopFrame.getByRole("button", { name: "Próximo slide da galeria" })
    .click();
  await desktopFrame.locator(".esv-product-modal-gallery-controls span")
    .waitFor({ state: "visible" });
  await desktopFrame.locator(".esv-product-modal-gallery-controls span").filter(
    { hasText: "02 — 02" },
  ).waitFor();
  assertComplete(
    await imageGeometry(
      desktopFrame.locator(".esv-product-modal-slide.is-active img").first(),
      ".esv-product-modal-image",
    ),
    "mixed active landscape",
  );
  await desktop.screenshot({
    path: `${ARTIFACT_DIR}/desktop-two-mixed-stage-2.png`,
  });
  await recordScenario("desktop-two-mixed-stage", {
    presentation: [mixedFirstClass, mixedSecondClass],
  });

  await openFixture(desktop, fixtures.threeMixed);
  const threeCount = await desktopFrame.locator(".esv-product-modal-image")
    .count();
  if (threeCount !== 3) fail("Three-image gallery lost media", { threeCount });
  assertComplete(
    await imageGeometry(
      desktopFrame.locator(".esv-product-modal-slide.is-active img").first(),
      ".esv-product-modal-image",
    ),
    "three mixed active",
  );
  await desktop.screenshot({ path: `${ARTIFACT_DIR}/desktop-three-mixed.png` });

  const opener = desktopFrame.locator(
    ".esv-product-modal-slide.is-active .esv-product-modal-image",
  ).first();
  await opener.click();
  await desktop.waitForSelector(".esv-product-viewer", { state: "visible" });
  await desktop.waitForFunction(() => {
    const image = document.querySelector(".esv-product-viewer-image");
    return image instanceof HTMLImageElement && image.complete &&
      image.naturalWidth > 0;
  });
  await desktop.waitForTimeout(220);
  const viewer1x = await imageGeometry(
    desktop.locator(".esv-product-viewer-image"),
    ".esv-product-viewer-stage",
  );
  assertComplete(viewer1x, "desktop viewer 1x");
  if (viewer1x.naturalWidth !== 2000 || viewer1x.naturalHeight !== 2000) {
    fail("Viewer did not use original high-resolution source", viewer1x);
  }
  const viewerScale = desktop.locator(".esv-product-viewer-stage");
  if ((await viewerScale.getAttribute("data-viewer-scale")) !== "1.00") {
    fail("Viewer did not open at 1x");
  }
  await desktop.screenshot({ path: `${ARTIFACT_DIR}/desktop-viewer-1x.png` });

  await desktop.getByRole("button", { name: "Aumentar zoom" }).click();
  await desktop.getByRole("button", { name: "Aumentar zoom" }).click();
  await desktop.waitForFunction(() =>
    Number(
      document.querySelector(".esv-product-viewer-stage")?.getAttribute(
        "data-viewer-scale",
      ),
    ) >= 2
  );
  const stageBox = await viewerScale.boundingBox();
  if (!stageBox) fail("Viewer stage has no box");
  await desktop.mouse.move(
    stageBox.x + stageBox.width / 2,
    stageBox.y + stageBox.height / 2,
  );
  await desktop.mouse.down();
  await desktop.mouse.move(
    stageBox.x + stageBox.width / 2 + 90,
    stageBox.y + stageBox.height / 2 + 45,
    { steps: 5 },
  );
  await desktop.mouse.up();
  const transformAfterPan = await desktop.locator(".esv-product-viewer-image")
    .getAttribute("style");
  if (!transformAfterPan?.includes("translate3d")) {
    fail("Viewer pan transform missing", { transformAfterPan });
  }
  await desktop.screenshot({
    path: `${ARTIFACT_DIR}/desktop-viewer-2x-pan.png`,
  });

  await desktop.keyboard.press("ArrowRight");
  await desktop.waitForFunction(() =>
    document.querySelector(".esv-product-zoom-controls span")?.textContent
      ?.trim() === "2 / 3"
  );
  if ((await viewerScale.getAttribute("data-viewer-scale")) !== "1.00") {
    fail("Viewer scale did not reset when changing media");
  }
  await recordScenario("desktop-viewer", { viewer1x, transformAfterPan });
  await desktop.keyboard.press("Escape");
  await desktop.waitForSelector(".esv-product-viewer", { state: "detached" });
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await mobileContext.newPage();
  await mobile.goto(BASE_URL, { waitUntil: "networkidle", timeout: 120000 });
  await openFixture(mobile, fixtures.twoMixed);

  const mobileFrame = mobile.locator(
    ".esv-product-modal-gallery-frame.is-compact",
  );
  const mobileGallery = mobileFrame.locator(".esv-product-modal-gallery");
  const mobileSlides = mobileGallery.locator(".esv-product-modal-image");
  if (await mobileSlides.count() !== 2) {
    fail("Mobile two-image gallery lost media");
  }
  const mobileWidths = await mobileGallery.evaluate((gallery) => ({
    gallery: gallery.getBoundingClientRect().width,
    slides: Array.from(gallery.querySelectorAll(".esv-product-modal-image"))
      .map((slide) => slide.getBoundingClientRect().width),
    snap: getComputedStyle(gallery).scrollSnapType,
  }));
  for (const width of mobileWidths.slides) {
    if (Math.abs(width - mobileWidths.gallery) > 2) {
      fail("Mobile slide is not one viewport", mobileWidths);
    }
  }
  if (!mobileWidths.snap.includes("mandatory")) {
    fail("Mobile scroll snap missing", mobileWidths);
  }
  assertComplete(
    await imageGeometry(
      mobileSlides.nth(0).locator("img"),
      ".esv-product-modal-image",
    ),
    "mobile portrait slide",
  );
  await mobileGallery.evaluate((gallery) =>
    gallery.scrollTo({ left: gallery.clientWidth, behavior: "auto" })
  );
  await mobileFrame.locator(".esv-product-modal-gallery-mobile-counter").filter(
    { hasText: "02 — 02" },
  ).waitFor();
  assertComplete(
    await imageGeometry(
      mobileSlides.nth(1).locator("img"),
      ".esv-product-modal-image",
    ),
    "mobile landscape slide",
  );
  await mobile.screenshot({ path: `${ARTIFACT_DIR}/mobile-two-mixed.png` });

  await mobileSlides.nth(1).click();
  await mobile.waitForSelector(".esv-product-viewer", { state: "visible" });
  await mobile.waitForFunction(() => {
    const image = document.querySelector(".esv-product-viewer-image");
    return image instanceof HTMLImageElement && image.complete &&
      image.naturalWidth > 0;
  });
  const mobileViewer1x = await imageGeometry(
    mobile.locator(".esv-product-viewer-image"),
    ".esv-product-viewer-stage",
  );
  assertComplete(mobileViewer1x, "mobile viewer 1x");
  if (
    mobileViewer1x.naturalWidth !== 3200 ||
    mobileViewer1x.naturalHeight !== 1800
  ) {
    fail("Mobile viewer did not use full landscape asset", mobileViewer1x);
  }
  await mobile.screenshot({ path: `${ARTIFACT_DIR}/mobile-viewer-1x.png` });

  const stage = mobile.locator(".esv-product-viewer-stage");
  const box = await stage.boundingBox();
  if (!box) fail("Mobile viewer stage missing box");
  const client = await mobileContext.newCDPSession(mobile);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const touch = (x, y, id) => ({ x, y, id, radiusX: 2, radiusY: 2, force: 1 });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(cx - 35, cy, 1), touch(cx + 35, cy, 2)],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [touch(cx - 95, cy, 1), touch(cx + 95, cy, 2)],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await mobile.waitForFunction(() =>
    Number(
      document.querySelector(".esv-product-viewer-stage")?.getAttribute(
        "data-viewer-scale",
      ),
    ) > 1.2
  );
  await mobile.screenshot({ path: `${ARTIFACT_DIR}/mobile-viewer-pinch.png` });

  while (Number(await stage.getAttribute("data-viewer-scale")) > 1.01) {
    await mobile.getByRole("button", { name: "Reduzir zoom" }).click();
  }
  await mobile.waitForFunction(() =>
    document.querySelector(".esv-product-viewer-stage")?.getAttribute(
      "data-viewer-scale",
    ) === "1.00"
  );

  await mobile.touchscreen.tap(cx, cy);
  await mobile.waitForTimeout(90);
  await mobile.touchscreen.tap(cx + 2, cy + 1);
  await mobile.waitForFunction(() =>
    Number(
      document.querySelector(".esv-product-viewer-stage")?.getAttribute(
        "data-viewer-scale",
      ),
    ) > 1.2
  );
  await recordScenario("mobile-viewer", {
    initial: mobileViewer1x,
    pinchScale: await stage.getAttribute("data-viewer-scale"),
  });

  metrics.status = "passed";
  await mobileContext.close();
} catch (error) {
  metrics.status = "failed";
  metrics.error = error instanceof Error
    ? error.stack || error.message
    : String(error);
  throw error;
} finally {
  await writeFile(
    `${ARTIFACT_DIR}/media-fidelity-metrics.json`,
    JSON.stringify(metrics, null, 2),
  );
  await browser.close();
}
