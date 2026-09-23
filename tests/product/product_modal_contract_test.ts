import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import {
  getProductFacts,
  getProductModalImages,
} from "../../islands/ProductModal.tsx";
import type { EsmeraObject } from "../../lib/payload/types.ts";

function product(overrides: Partial<EsmeraObject> = {}): EsmeraObject {
  return {
    id: "object-1",
    slug: "object-1",
    code: "ESM-001",
    title: "Objeto I",
    image: "https://cdn.example.com/object-cover.jpg",
    alt: "Objeto I",
    availability: "available",
    material: "Esmeralda e pedra",
    gallery: [{
      url: "https://cdn.example.com/object-cover.jpg",
      alt: "Objeto I",
      key: "cover",
      role: "cover",
    }],
    attributes: [],
    priceMode: "fixed",
    priceCents: 120000,
    formattedPrice: "R$ 1.200,00",
    isInquiry: false,
    variants: [],
    seo: { title: "Objeto I", description: "", noindex: false },
    price: "R$ 1.200,00",
    ...overrides,
  };
}

Deno.test("one available photo occupies the modal gallery alone", () => {
  const images = getProductModalImages(product());
  assertEquals(images.length, 1);
  assertEquals(images[0].src, "https://cdn.example.com/object-cover.jpg");
});

Deno.test("two available photos produce a split-capable gallery without duplicates", () => {
  const detail = "https://cdn.example.com/object-detail.jpg";
  const images = getProductModalImages(product({
    detailImage: detail,
    gallery: [
      {
        url: "https://cdn.example.com/object-cover.jpg",
        alt: "Objeto I",
        key: "cover",
        role: "cover",
      },
      {
        url: detail,
        alt: "Detalhe do Objeto I",
        key: "detail",
        role: "detail",
      },
    ],
  }));

  assertEquals(images.map((image) => image.src), [
    "https://cdn.example.com/object-cover.jpg",
    detail,
  ]);
});

Deno.test("three available photos are all preserved in editorial order", () => {
  const detail = "https://cdn.example.com/object-detail.jpg";
  const context = "https://cdn.example.com/object-context.jpg";
  const images = getProductModalImages(product({
    detailImage: detail,
    gallery: [
      {
        url: "https://cdn.example.com/object-cover.jpg",
        alt: "Objeto I",
        key: "cover",
        role: "cover",
      },
      {
        url: detail,
        alt: "Detalhe do Objeto I",
        key: "detail",
        role: "detail",
      },
      {
        url: context,
        alt: "Objeto I em contexto",
        key: "context",
        role: "context",
      },
    ],
  }));

  assertEquals(images.map((image) => image.src), [
    "https://cdn.example.com/object-cover.jpg",
    detail,
    context,
  ]);
});

Deno.test("five unique valid photos remain available to modal and viewer", () => {
  const images = getProductModalImages(product({
    detailImage: "https://cdn.example.com/object-detail.jpg",
    gallery: [
      {
        url: "https://cdn.example.com/object-cover.jpg",
        alt: "Objeto I",
        key: "cover",
        role: "cover",
      },
      {
        url: "https://cdn.example.com/object-detail.jpg",
        alt: "Detalhe principal",
        key: "detail-1",
        role: "detail",
      },
      {
        url: "https://cdn.example.com/object-detail-2.jpg",
        alt: "Outro detalhe",
        key: "detail-2",
        role: "detail",
      },
      {
        url: "https://cdn.example.com/object-context.jpg",
        alt: "Objeto I em contexto",
        key: "context",
        role: "context",
      },
      {
        url: "https://cdn.example.com/object-scale.jpg",
        alt: "Objeto I em escala",
        key: "scale",
        role: "scale",
      },
    ],
  }));

  assertEquals(images.map((image) => image.src), [
    "https://cdn.example.com/object-cover.jpg",
    "https://cdn.example.com/object-detail.jpg",
    "https://cdn.example.com/object-detail-2.jpg",
    "https://cdn.example.com/object-context.jpg",
    "https://cdn.example.com/object-scale.jpg",
  ]);
});

Deno.test("gallery drops empty URLs, cover duplicates and repeated detail media", () => {
  const detail = "https://cdn.example.com/object-detail.jpg";
  const context = "https://cdn.example.com/object-context.jpg";
  const images = getProductModalImages(product({
    detailImage: detail,
    gallery: [
      {
        url: "https://cdn.example.com/object-cover.jpg",
        alt: "Cover duplicada",
        key: "cover",
        role: "cover",
      },
      {
        url: "   ",
        alt: "Inválida",
        key: "empty",
        role: "detail",
      },
      {
        url: detail,
        alt: "Detalhe duplicado",
        key: "detail-duplicate",
        role: "detail",
      },
      {
        url: context,
        alt: "Contexto",
        key: "context",
        role: "context",
      },
      {
        url: context,
        alt: "Contexto duplicado",
        key: "context-duplicate",
        role: "scale",
      },
    ],
  }));

  assertEquals(images.map((image) => image.src), [
    "https://cdn.example.com/object-cover.jpg",
    detail,
    context,
  ]);
});

Deno.test("buybox includes every populated fact and removes duplicate labels", () => {
  const facts = getProductFacts(product({
    category: "Esculturas",
    edition: "Peça única",
    attributes: [
      { label: "Dimensões", value: "32 × 18 cm" },
      { label: "Material", value: "Valor duplicado" },
    ],
  }));

  assertEquals(facts, [
    { label: "Código", value: "ESM-001" },
    { label: "Categoria", value: "Esculturas" },
    { label: "Material", value: "Esmeralda e pedra" },
    { label: "Edição", value: "Peça única" },
    { label: "Dimensões", value: "32 × 18 cm" },
  ]);
});

Deno.test("cards and Conhecer a peça share the adaptive modal and never navigate", async () => {
  const card = await Deno.readTextFile("components/esmera/ObjectCard.tsx");
  const actions = await Deno.readTextFile("islands/ProductActions.tsx");
  const modal = await Deno.readTextFile("islands/ProductModal.tsx");
  const viewer = await Deno.readTextFile(
    "components/esmera/ProductMediaViewer.tsx",
  );
  const css = await Deno.readTextFile("static/esmera-product-modal.css");
  const recommendationsRoute = await Deno.readTextFile(
    "routes/api/esmera-recommendations.ts",
  );

  assertFalse(card.includes("/produto/"));
  assertStringIncludes(card, 'presentation="media"');
  assertFalse(card.includes('presentation="title"'));
  assertStringIncludes(actions, 'dispatch("esmera:open-product"');
  assertStringIncludes(modal, 'class="esv-product-modal-buybox"');
  assertStringIncludes(modal, 'class="esv-product-modal-installment"');
  assertStringIncludes(modal, "buildInstallmentFromPriceCents");
  assertStringIncludes(modal, "buildGalleryPlates");
  assertStringIncludes(modal, "orderGalleryMedia");
  assertStringIncludes(modal, "plateLabel(activeIndex, plates.length)");
  assertStringIncludes(modal, "cellSizes(plate)");
  assertStringIncludes(modal, "mediaIndexForKeys(images, next.mediaKeys)");
  assertStringIncludes(modal, "plateIndexOfMedia(desktopPlates, mediaIndex)");
  assertStringIncludes(modal, 'event.key === "ArrowLeft"');
  assertStringIncludes(modal, 'event.key === "ArrowRight"');
  assertStringIncludes(modal, 'event.key === "Home"');
  assertStringIncludes(modal, 'event.key === "End"');
  assertStringIncludes(
    modal,
    'fetchPriority: plateIndex === 0 ? "high" : "auto"',
  );
  assertFalse(modal.includes("(min-width: 1024px) 35vw, 100vw"));
  assertFalse(modal.includes("(min-width: 1024px) 70vw, 100vw"));
  assertStringIncludes(modal, 'view="desktop"');
  assertStringIncludes(modal, 'view="compact"');
  assertFalse(modal.includes("esv-product-modal-empty-cell"));
  assertStringIncludes(modal, "plate.indices.map");
  assertStringIncludes(modal, "ProductMediaViewer");
  assertFalse(modal.includes(".slice(0, 2)"));
  assertStringIncludes(viewer, 'event.key === "ArrowLeft"');
  assertStringIncludes(viewer, 'event.key === "ArrowRight"');
  assertStringIncludes(viewer, "data-viewer-scale");
  assertStringIncludes(viewer, "onPointerMove");
  assertStringIncludes(viewer, "onWheel");
  assertStringIncludes(modal, 'root.style.overflow = "hidden"');
  assertStringIncludes(modal, "root.style.overflow = previous.rootOverflow");
  assertStringIncludes(
    modal,
    'if (!product || images.length === 0 || phase === "closing") return;',
  );
  assertStringIncludes(css, ".esv-product-modal-slide.is-pair");
  assertStringIncludes(css, ".esv-product-modal-slide.is-mounted");
  assertStringIncludes(css, "aspect-ratio: 3 / 2");
  assertStringIncludes(css, "aspect-ratio: 1 / 1");
  assertStringIncludes(
    css,
    "calc(132dvh + var(--esv-modal-buybox-w))",
  );
  assertFalse(css.includes("88dvh * 1.5"));
  assertStringIncludes(css, "contain: size;");
  assertStringIncludes(
    css,
    "(max-width: 1180px) and (orientation: portrait)",
  );
  assertFalse(css.includes("--esv-modal-gallery-ratio"));
  assertFalse(css.includes(".esv-product-modal-empty-cell"));
  assertStringIncludes(css, "scroll-snap-type: x mandatory");
  assertStringIncludes(css, ".esv-product-modal-gallery-mobile-counter");
  assertStringIncludes(css, "object-fit: contain");
  assertStringIncludes(css, "opacity 160ms cubic-bezier(.4, 0, .2, 1)");
  assertStringIncludes(css, "@media (prefers-reduced-motion: reduce)");
  assertFalse(css.includes("!important"));
  assertFalse(css.includes("object-fit: cover"));
  assertFalse(css.includes("is-two-stage"));
  assertFalse(css.includes("is-double"));
  assertFalse(css.includes("is-multiple"));
  assertFalse(css.includes("esv-product-modal-empty-cell"));
  assertStringIncludes(
    css,
    "grid-template-columns: repeat(2, minmax(0, 1fr));",
  );
  assertFalse(modal.includes("gallerySize"));
  assertFalse(modal.includes("galleryFrameRef"));
  assertFalse(modal.includes("ResizeObserver"));
  assertStringIncludes(modal, 'type ModalPhase = "unmounted" | "opening"');
  assertStringIncludes(modal, 'updatePhase("closing")');
  assertStringIncludes(modal, "onTransitionEnd");
  assertStringIncludes(modal, "MODAL_TRANSITION_FALLBACK_MS");
  assertStringIncludes(modal, "controller.abort()");
  assertStringIncludes(modal, "VOCÊ TAMBÉM VAI GOSTAR");
  assertStringIncludes(modal, "item.id !== product.id");
  assertStringIncludes(recommendationsRoute, "MAX_RECOMMENDATIONS = 4");
  assertStringIncludes(recommendationsRoute, "new Set([productId])");
  assertStringIncludes(recommendationsRoute, 'sort: "newest"');
  assertStringIncludes(css, ".esv-product-viewer-stage");
});

Deno.test("Matter is a whole-panel category link with stable overlay CSS", async () => {
  const matter = await Deno.readTextFile("sections/Esmera/Matter.tsx");
  const css = await Deno.readTextFile("static/esmera-matter-interaction.css");

  assertStringIncludes(matter, 'class="esv-territory-panel is-clickable"');
  assertStringIncludes(matter, "panel.category ?? panel.cta");
  assertStringIncludes(matter, "baselineCategoryLinks");
  assertStringIncludes(matter, 'href: "/colecao/esculturas"');
  assertStringIncludes(matter, 'href: "/colecao/vasos"');
  assertStringIncludes(matter, 'href: "/colecao/bandejas"');
  assertStringIncludes(matter, 'class="esv-territory-link"');
  assertStringIncludes(css, ".esv-territory-media,");
  assertStringIncludes(css, "position: absolute;");
  assertStringIncludes(css, ".esv-territory-copy {");
  assertStringIncludes(css, "transform: none;");
});
