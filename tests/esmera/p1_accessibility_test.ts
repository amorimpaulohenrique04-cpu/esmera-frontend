import { collectionFacetCategories } from "../../lib/esmera/categoryFacets.ts";
import type { StorefrontCategory } from "../../lib/payload/navigation.ts";

function category(
  slug: string,
  nodeType: StorefrontCategory["nodeType"],
  overrides: Partial<StorefrontCategory> = {},
): StorefrontCategory {
  return {
    id: slug,
    title: slug,
    label: slug,
    slug,
    description: "",
    order: 1,
    parentId: null,
    showInMenu: true,
    menuVisibility: "both",
    nodeType,
    href: nodeType === "collection" ? `/colecao/${slug}` : `/pagina/${slug}`,
    external: nodeType === "external",
    highlights: [],
    ...overrides,
  };
}

Deno.test("P1 category facet exposes only real collection nodes", () => {
  const result = collectionFacetCategories([
    category("bandejas", "collection"),
    category("contato", "editorial"),
    category("duvidas-frequentes", "editorial"),
    category("falar-com-a-esmera", "external", {
      href: "https://example.com",
      external: true,
    }),
    category("pecas", "group"),
    category("bandejas", "collection"),
  ]);

  const slugs = result.map((item) => item.slug);
  if (slugs.length !== 1 || slugs[0] !== "bandejas") {
    throw new Error(`unexpected category facets: ${JSON.stringify(slugs)}`);
  }
});

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16)
  );
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

Deno.test("P1 secondary text token meets WCAG AA on Esmera light surfaces", async () => {
  // P3 moved first-paint design tokens into the canonical critical stylesheet.
  // The accessibility layer consumes --muted but does not redefine it.
  const [criticalCss, p1Css] = await Promise.all([
    Deno.readTextFile("static/esmera-critical.css"),
    Deno.readTextFile("static/esmera-accessibility-p1-v1.css"),
  ]);
  const muted = criticalCss.match(/--muted:\s*(#[0-9A-Fa-f]{6})/)?.[1];
  if (!muted) throw new Error("P1 muted token is missing");

  for (const background of ["#F3F0E8", "#E9E5DC"]) {
    const ratio = contrast(muted, background);
    if (ratio < 4.5) {
      throw new Error(
        `${muted} on ${background} is only ${ratio.toFixed(2)}:1`,
      );
    }
  }

  if (!/input::placeholder[\s\S]*opacity:\s*1/.test(p1Css)) {
    throw new Error("collection placeholder must not dilute the AA token");
  }
});

Deno.test("P1 category sanitization is wired into page and API queries", async () => {
  const [page, api] = await Promise.all([
    Deno.readTextFile("routes/colecao/index.tsx"),
    Deno.readTextFile("routes/api/esmera-collection.ts"),
  ]);
  for (const source of [page, api]) {
    if (!source.includes("collectionFacetCategories(chrome.categories)")) {
      throw new Error(
        "collection category sanitization is not wired end-to-end",
      );
    }
  }
});
