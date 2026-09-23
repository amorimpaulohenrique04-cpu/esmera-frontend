import { assert, assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("motion lifecycle keeps menu, drawer and overlays mounted through exit", async () => {
  const menu = await Deno.readTextFile("islands/DynamicMenu.tsx");
  const header = await Deno.readTextFile("islands/EsmeraHeader.tsx");
  const modal = await Deno.readTextFile("islands/ProductModal.tsx");
  const motion = await Deno.readTextFile("static/esmera-motion-v2.css");

  assertStringIncludes(
    menu,
    'type MenuPhase = "closed" | "opening" | "open" | "closing";',
  );
  assertStringIncludes(menu, 'megaPhase === "closing" ? " is-closing" : ""');
  assertStringIncludes(menu, 'drawerPhase === "closing" ? " is-closing" : ""');
  assertStringIncludes(menu, 'class="esv-mega-v2-inner esv-mega-v2-content"');
  assertEquals(
    menu.includes('key={activeDesktop.id}\n          class="esv-mega-v2"'),
    false,
  );

  assertStringIncludes(
    header,
    'type OverlayPhase = "closed" | "opening" | "open" | "closing";',
  );
  assertStringIncludes(
    header,
    'overlayPhase === "closing" ? " is-closing" : ""',
  );
  assertStringIncludes(header, "data-header-surface={headerSurface}");
  assertStringIncludes(header, "OVERLAY_EXIT_FALLBACK_MS");

  assertStringIncludes(
    modal,
    'type ModalPhase = "unmounted" | "opening" | "open" | "closing";',
  );
  assertStringIncludes(modal, "data-phase={phase}");
  assertStringIncludes(
    motion,
    '.esv-product-modal-backdrop[data-phase="closing"]',
  );
});

Deno.test("hero carousel uses decoded dual-layer crossfade instead of hard swap", async () => {
  const carousel = await Deno.readTextFile("islands/HeroCarousel.tsx");
  const motion = await Deno.readTextFile("static/esmera-motion-v2.css");

  assertStringIncludes(carousel, "async function decodeSlide");
  assertStringIncludes(carousel, "await image.decode()");
  assertStringIncludes(carousel, "const [incoming, setIncoming]");
  assertStringIncludes(carousel, 'className="is-incoming"');
  assertStringIncludes(carousel, "HERO_TRANSITION_FALLBACK_MS");
  assertStringIncludes(
    motion,
    ".esv-hero-carousel.is-transitioning .esv-hero-carousel-media.is-incoming",
  );
  assertStringIncludes(motion, "--motion-hero: 360ms;");
});

Deno.test("homepage reveal contract is explicit and product cards reveal as one unit", async () => {
  const card = await Deno.readTextFile("components/esmera/ObjectCard.tsx");
  const reveal = await Deno.readTextFile("islands/EsmeraMotion.tsx");
  const manifesto = await Deno.readTextFile("sections/Esmera/Manifesto.tsx");
  const matter = await Deno.readTextFile("sections/Esmera/Matter.tsx");

  assertStringIncludes(card, 'data-motion="reveal"');
  assertEquals(card.includes('data-motion="media-reveal"'), false);
  assertEquals(reveal.includes("fallbackRevealSelectors"), false);
  assertEquals(reveal.includes("legacyStaggerSelectors"), false);
  assertEquals(reveal.includes("setTimeout"), false);
  assertStringIncludes(
    reveal,
    "document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)",
  );

  assertStringIncludes(manifesto, 'data-motion="media-reveal"');
  assertEquals(matter.includes('data-motion="media-reveal"'), false);
  assertStringIncludes(matter, 'data-motion="reveal"');
  assertStringIncludes(matter, "data-motion-order={String(index)}");
});

Deno.test("cross-document navigation uses one sequential root handoff", async () => {
  const app = await Deno.readTextFile("routes/_app.tsx");
  const motion = await Deno.readTextFile("static/esmera-motion-v2.css");

  assertStringIncludes(motion, "@view-transition");
  assertStringIncludes(motion, "navigation: auto;");
  assertEquals(motion.includes("view-transition-name"), false);
  assertEquals(motion.includes("esmera-main"), false);
  assertStringIncludes(motion, "--motion-page-exit: 80ms;");
  assertStringIncludes(motion, "--motion-page-enter: 160ms;");
  assertStringIncludes(motion, "::view-transition-old(root)");
  assertStringIncludes(motion, "::view-transition-new(root)");
  assertStringIncludes(
    motion,
    "::view-transition-old(root) {\n  opacity: 1;",
  );
  assertStringIncludes(
    motion,
    "::view-transition-new(root) {\n  opacity: 0;",
  );
  assertStringIncludes(
    motion,
    "animation: esv-page-out var(--motion-page-exit) var(--ease-standard) both;",
  );
  assertStringIncludes(
    motion,
    "var(--motion-page-exit) both;",
  );
  assertStringIncludes(motion, "@keyframes esv-page-out");
  assertStringIncludes(motion, "@keyframes esv-page-in");
  assertStringIncludes(motion, "::view-transition-group(root)");
  assertStringIncludes(motion, "animation: none !important;");

  const headerCss = app.indexOf("/esmera-header.css");
  const productCardCss = app.indexOf("/esmera-product-card.css");
  const motionCss = app.indexOf("/esmera-motion-v2.css");
  assert(
    headerCss >= 0 && productCardCss > headerCss && motionCss > productCardCss,
  );

  // Component-local motion remains owned by the canonical motion layer.
  assertStringIncludes(
    motion,
    ".esv-product-card:hover .esv-product-media-wrap",
  );
  assertStringIncludes(
    motion,
    '.esv-product-modal-backdrop[data-phase="closing"]',
  );
  assertStringIncludes(
    motion,
    ".esv-hero-carousel.is-transitioning .esv-hero-carousel-media.is-incoming",
  );
  assertStringIncludes(motion, "box-shadow: none !important;");
  assertEquals(
    motion.includes(".esv-product-card .esv-product-media img {"),
    false,
  );
});
