import {
  assert,
  assertFalse,
  assertStringIncludes,
} from "@std/assert";

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

Deno.test("P2 keeps dead/override layers removed", async () => {
  assertFalse(await exists("static/esmera-collection-filter-label-fix.css"));
  assertFalse(await exists("static/esmera-header-proportions.css"));
  assertFalse(await exists("islands/BuyFlow.tsx"));
  assertFalse(await exists("islands/MenuNavigationCoordinator.tsx"));
  assertFalse(await exists("islands/ProductModalLinkSync.tsx"));

  const app = await Deno.readTextFile("routes/_app.tsx");
  assertFalse(app.includes("esmera-collection-filter-label-fix.css"));
  assertFalse(app.includes("esmera-header-proportions.css"));
});

Deno.test("P2 serves responsive Payload media instead of fixed oversized images", async () => {
  const media = await Deno.readTextFile("components/esmera/ResponsiveMedia.tsx");
  const cards = await Deno.readTextFile("components/esmera/ObjectCard.tsx");
  const carousel = await Deno.readTextFile("islands/HeroCarousel.tsx");

  assertStringIncludes(media, "payloadMediaSrcSet");
  assertStringIncludes(media, "srcSet={srcSet}");
  assertStringIncludes(media, 'imageSizes="100vw"');
  assertStringIncludes(cards, 'fetchPriority={priority ? "high" : "auto"}');
  assertStringIncludes(carousel, "firstDesktopSrcSet");
  assertStringIncludes(carousel, 'fetchPriority="high"');
});

Deno.test("P2 folds global coordination into existing islands", async () => {
  const layout = await Deno.readTextFile("components/esmera/StorefrontLayout.tsx");
  const header = await Deno.readTextFile("islands/EsmeraHeader.tsx");
  const modal = await Deno.readTextFile("islands/ProductModal.tsx");

  assertFalse(layout.includes("<MenuNavigationCoordinator"));
  assertFalse(layout.includes("<ProductModalLinkSync"));
  assertStringIncludes(header, "useMenuNavigationCoordinator();");
  assertStringIncludes(modal, "useProductModalLinkSync();");
});

Deno.test("P2 CSS source budgets stay bounded", async () => {
  const budgets: Record<string, number> = {
    "static/esmera-master.css": 40_000,
    "static/esmera-header.css": 22_000,
    "static/esmera-commerce-refine.css": 17_000,
    "static/esmera-product-card.css": 22_000,
    "static/esmera-product-modal.css": 22_000,
    "static/esmera-catalog-v2.css": 17_000,
    "static/esmera-collection-filter-v3.css": 15_000,
    "static/esmera-home-art-direction-v2.css": 19_000,
    "static/esmera-home-length-refinement-v3.css": 16_000,
  };

  for (const [path, maxBytes] of Object.entries(budgets)) {
    const bytes = (await Deno.readFile(path)).byteLength;
    assert(
      bytes <= maxBytes,
      `${path} is ${bytes} bytes; P2 budget is ${maxBytes}`,
    );
  }
});
