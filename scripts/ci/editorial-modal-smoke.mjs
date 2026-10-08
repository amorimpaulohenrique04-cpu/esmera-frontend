import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8000/";
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "smoke-artifacts";

await mkdir(ARTIFACT_DIR, { recursive: true });

function markedSvg(label, width, height, tone) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${tone}"/><rect x="18" y="18" width="${
      width - 36
    }" height="${
      height - 36
    }" fill="none" stroke="#111210" stroke-width="18"/><text x="${
      width / 2
    }" y="${
      height / 2
    }" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="64" fill="#111210">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function media(index, role, width, height, tone) {
  const url = markedSvg(`ESMERA ${index}`, width, height, tone);
  return {
    url,
    fullUrl: url,
    alt: `Imagem ${index} da peça smoke`,
    key: `smoke-${index}`,
    role,
    width,
    height,
    fullWidth: width,
    fullHeight: height,
  };
}

function galleryFixture() {
  const gallery = [
    media(1, "cover", 900, 1125, "#d9d3c8"),
    media(2, "detail", 900, 1125, "#c8c0b3"),
    media(3, "context", 1600, 900, "#b8b2a8"),
    media(4, "scale", 900, 1125, "#a9a49a"),
  ];
  return {
    id: "smoke-gallery-4",
    slug: "smoke-gallery-4",
    code: "SMOKE-4",
    title: "Galeria smoke",
    image: gallery[0].url,
    alt: "Peça Esméra para smoke test",
    availability: "available",
    material: "Pedra natural",
    gallery,
    attributes: [],
    priceMode: "fixed",
    priceCents: 120000,
    formattedPrice: "R$ 1.200,00",
    isInquiry: false,
    variants: [],
    seo: { title: "Galeria smoke", description: "", noindex: false },
    price: "R$ 1.200,00",
  };
}

async function openFixture(page) {
  await page.evaluate((product) => {
    globalThis.dispatchEvent(
      new CustomEvent("esmera:open-product", { detail: { product } }),
    );
  }, galleryFixture());
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
}

async function validateMatter(page) {
  const panel = page.locator(".esv-territory-panel.is-clickable").first();
  await panel.waitFor({ state: "visible", timeout: 20000 });
  const geometry = await panel.evaluate((element) => {
    const copy = element.querySelector(".esv-territory-copy");
    if (!(copy instanceof HTMLElement)) throw new Error("Matter copy missing");
    const panelRect = element.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    return {
      tag: element.tagName,
      panelTop: panelRect.top,
      panelBottom: panelRect.bottom,
      copyTop: copyRect.top,
      copyBottom: copyRect.bottom,
    };
  });
  if (geometry.tag !== "A") {
    throw new Error(`Matter panel is not a link: ${JSON.stringify(geometry)}`);
  }
  if (
    geometry.copyTop < geometry.panelTop - 1 ||
    geometry.copyBottom > geometry.panelBottom + 1
  ) {
    throw new Error(
      `Matter overlay escaped panel: ${JSON.stringify(geometry)}`,
    );
  }
}

async function validateDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 120000 });
    await validateMatter(page);
    await openFixture(page);

    const modal = page.locator(".esv-product-modal");
    const columns = await modal.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns
    );
    if (columns.split(" ").length < 2) {
      throw new Error(`Desktop modal is not two-column: ${columns}`);
    }
    await page.locator(".esv-product-modal-buybox").waitFor({
      state: "visible",
    });

    const frame = page.locator(".esv-product-modal-gallery-frame.is-desktop");
    const images = frame.locator(".esv-product-modal-image");
    if (await images.count() !== 4) {
      throw new Error(`Desktop gallery lost media: ${await images.count()}`);
    }
    const slides = frame.locator(".esv-product-modal-slide");
    const slideCount = await slides.count();
    if (slideCount < 2) {
      throw new Error(`Expected multiple desktop slides, got ${slideCount}`);
    }
    const before = await slides.evaluateAll((nodes) =>
      nodes.findIndex((node) => node.classList.contains("is-active"))
    );
    await frame.getByRole("button", { name: "Próximo slide da galeria" })
      .click();
    await page.waitForTimeout(280);
    const after = await slides.evaluateAll((nodes) =>
      nodes.findIndex((node) => node.classList.contains("is-active"))
    );
    if (before === after || after < 0) {
      throw new Error(`Desktop slide did not advance: ${before} -> ${after}`);
    }

    const opener = frame.locator(
      ".esv-product-modal-slide.is-active .esv-product-modal-image",
    ).first();
    await opener.click();
    await page.waitForSelector(".esv-product-viewer", { state: "visible" });
    await page.getByRole("button", { name: "Fechar visualizador" }).click();
    await page.waitForSelector(".esv-product-viewer", { state: "detached" });
    await page.waitForSelector(".esv-product-modal", { state: "visible" });
    await page.screenshot({ path: `${ARTIFACT_DIR}/desktop-modal.png` });
    await page.keyboard.press("Escape");
    await page.waitForSelector(".esv-product-modal", { state: "detached" });
  } finally {
    await context.close();
  }
}

async function validateMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 120000 });
    await validateMatter(page);
    await openFixture(page);

    const size = await page.locator(".esv-product-modal").evaluate((
      element,
    ) => ({
      width: element.getBoundingClientRect().width,
      viewport: globalThis.innerWidth,
    }));
    if (Math.abs(size.width - size.viewport) > 2) {
      throw new Error(
        `Mobile modal is not full width: ${JSON.stringify(size)}`,
      );
    }

    const frame = page.locator(".esv-product-modal-gallery-frame.is-compact");
    const gallery = frame.locator(".esv-product-modal-gallery");
    const images = frame.locator(".esv-product-modal-image");
    if (await images.count() !== 4) {
      throw new Error(`Mobile gallery lost media: ${await images.count()}`);
    }
    const scroll = await gallery.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    if (scroll.scrollWidth <= scroll.clientWidth) {
      throw new Error(
        `Mobile gallery is not scrollable: ${JSON.stringify(scroll)}`,
      );
    }
    await gallery.evaluate((element) =>
      element.scrollTo({ left: element.clientWidth, behavior: "auto" })
    );
    await page.waitForTimeout(220);
    const scrollLeft = await gallery.evaluate((element) => element.scrollLeft);
    if (scrollLeft <= 0) throw new Error("Mobile gallery did not advance");
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-modal.png` });
    await page.keyboard.press("Escape");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await validateDesktop(browser);
  await validateMobile(browser);
  await writeFile(
    `${ARTIFACT_DIR}/status.json`,
    JSON.stringify({ status: "passed" }, null, 2),
  );
  console.log("Editorial modal smoke passed");
} catch (error) {
  const stack = error instanceof Error
    ? error.stack ?? error.message
    : String(error);
  await writeFile(`${ARTIFACT_DIR}/error.txt`, stack);
  throw error;
} finally {
  await browser.close();
}
