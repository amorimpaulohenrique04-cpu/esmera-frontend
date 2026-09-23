import { assertEquals } from "@std/assert";
import {
  resolveCallToAction,
  toEsmeraObject,
  toHero,
  toMatterPanels,
  toSEO,
} from "../../lib/payload/adapters.ts";
import type { PayloadHome, PayloadProduct } from "../../lib/payload/types.ts";

const media = {
  id: 1,
  url: "/media/object.jpg",
  alt: "Objeto",
  _status: "published" as const,
};
const product = {
  id: 10,
  title: "Objeto",
  slug: "objeto",
  code: "OBJ-10",
  catalogStatus: "active",
  _status: "published",
  availability: "available",
  priceMode: "fixed",
  basePriceCents: 10000,
  gallery: [{
    image: media,
    mediaKey: "cover",
    role: "cover",
    alt: "Editorial",
  }],
  variants: [{ sku: "V1", status: "enabled", priceMode: "inquiry" }],
} satisfies PayloadProduct;

Deno.test("adapts published products and rejects inactive relationships", () => {
  const adapted = toEsmeraObject(product, "https://cms.example.com");
  assertEquals(adapted?.image, "https://cms.example.com/media/object.jpg");
  assertEquals(adapted?.priceCents, 10000);
  assertEquals(adapted?.gallery.length, 1);
  assertEquals(adapted?.variants[0].isInquiry, true);
  assertEquals(
    toEsmeraObject({ ...product, _status: "draft" }, "https://cms.example.com"),
    null,
  );
});

Deno.test("product gallery prefers the uncropped gallery rendition and preserves original dimensions", () => {
  const portrait = {
    id: 2,
    url: "/media/portrait-original.jpg",
    width: 2000,
    height: 2500,
    alt: "Peça vertical",
    _status: "published" as const,
    sizes: {
      wide: {
        url: "/media/portrait-wide-cropped.jpg",
        width: 1800,
        height: 1200,
      },
      gallery: {
        url: "/media/portrait-gallery.jpg",
        width: 1280,
        height: 1600,
      },
    },
  };
  const adapted = toEsmeraObject({
    ...product,
    gallery: [{ image: portrait, mediaKey: "cover", role: "cover" }],
  }, "https://cms.example.com");
  const gallery = adapted?.gallery[0];

  assertEquals(
    gallery?.url,
    "https://cms.example.com/media/portrait-gallery.jpg",
  );
  assertEquals(gallery?.width, 1280);
  assertEquals(gallery?.height, 1600);
  assertEquals(
    gallery?.fullUrl,
    "https://cms.example.com/media/portrait-original.jpg",
  );
  assertEquals(gallery?.fullWidth, 2000);
  assertEquals(gallery?.fullHeight, 2500);
});

Deno.test("product gallery falls back to the original instead of the cropped wide rendition", () => {
  const legacyPortrait = {
    id: 3,
    url: "/media/legacy-original.jpg",
    width: 1600,
    height: 2000,
    alt: "Peça vertical legada",
    _status: "published" as const,
    sizes: {
      wide: {
        url: "/media/legacy-wide-cropped.jpg",
        width: 1800,
        height: 1200,
      },
    },
  };
  const adapted = toEsmeraObject({
    ...product,
    gallery: [{ image: legacyPortrait, mediaKey: "cover", role: "cover" }],
  }, "https://cms.example.com");
  const gallery = adapted?.gallery[0];

  assertEquals(
    gallery?.url,
    "https://cms.example.com/media/legacy-original.jpg",
  );
  assertEquals(gallery?.width, 1600);
  assertEquals(gallery?.height, 2000);
  assertEquals(gallery?.fullWidth, 1600);
  assertEquals(gallery?.fullHeight, 2000);
});

Deno.test("adapts home hero, CTA and SEO without unsafe HTML", () => {
  const home = {
    _status: "published",
    heroMode: "single",
    heroSlides: [{
      desktopImage: media,
      statement: "Matéria",
      callToAction: { label: "Coleção", href: "/colecao", kind: "internal" },
    }],
  } satisfies PayloadHome;
  assertEquals(
    toHero(home, "https://cms.example.com").slides[0].statement,
    "Matéria",
  );
  assertEquals(
    resolveCallToAction({ label: "Externo", href: "https://example.com" })
      ?.external,
    true,
  );
  assertEquals(
    resolveCallToAction({ label: "Inválido", href: "javascript:alert(1)" }),
    null,
  );
  assertEquals(
    toSEO({ title: "Objeto", noindex: true }, null, "https://cms.example.com")
      .noindex,
    true,
  );
});

Deno.test("Matter panels select the dedicated 5:9 territory media", () => {
  const home = {
    _status: "published",
    matterPanels: [{
      image: {
        id: 20,
        url: "/media/original.jpg",
        alt: "Vaso",
        _status: "published",
        sizes: {
          wide: {
            url: "/media/vaso-1800x1200.jpg",
            width: 1800,
            height: 1200,
          },
          territory: {
            url: "/media/vaso-1200x2160.jpg",
            width: 1200,
            height: 2160,
          },
        },
      },
      eyebrow: "VASOS",
      headline: "Forma em silêncio.",
    }],
  } satisfies PayloadHome;

  const panel = toMatterPanels(home, "https://cms.example.com")[0];
  assertEquals(panel.image, "https://cms.example.com/media/vaso-1200x2160.jpg");
});
