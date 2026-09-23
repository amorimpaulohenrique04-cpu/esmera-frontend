import { assert, assertFalse, assertStringIncludes } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import EsmeraHeader from "../../islands/EsmeraHeader.tsx";
import type { NavigationNode } from "../../lib/payload/navigation.ts";

const menu: NavigationNode[] = [
  {
    id: "home",
    label: "HOME",
    href: "/",
    external: false,
    visibility: "both",
    highlights: [],
    children: [],
  },
  {
    id: "pieces",
    label: "PEÇAS",
    href: "/colecao",
    external: false,
    visibility: "both",
    highlights: [],
    children: [],
  },
];

Deno.test("shared header owns root navigation and preserves Menu → Logo → Search → Cart order", () => {
  const html = renderToString(
    <EsmeraHeader
      logo="ESMÉRA"
      enquiryLabel="Carrinho"
      menu={menu}
      whatsappHref="https://wa.me/5500000000000"
    />,
  );

  const headerStart = html.indexOf("<header");
  const headerEnd = html.indexOf("</header>", headerStart);
  const headerClass = html.indexOf('class="esv-header', headerStart);
  const navStart = html.indexOf('<nav class="esv-nav-v2-desktop"', headerStart);
  const wordmarkStart = html.indexOf('class="esv-wordmark"', headerStart);
  const searchStart = html.indexOf('aria-label="Buscar objetos"', headerStart);
  const cartStart = html.indexOf("Carrinho", searchStart);

  assert(headerStart >= 0);
  assert(headerEnd > headerStart);
  assert(headerClass > headerStart && headerClass < headerEnd);
  assert(navStart > headerStart && navStart < headerEnd);
  assert(wordmarkStart > navStart && wordmarkStart < headerEnd);
  assert(searchStart > wordmarkStart && searchStart < headerEnd);
  assert(cartStart > searchStart && cartStart < headerEnd);

  assertStringIncludes(html, 'data-header-variant="solid"');
  assertStringIncludes(html, 'data-header-state="solid"');
  assertStringIncludes(html, "is-solid");
  assertStringIncludes(html, 'href="/"');
  assertStringIncludes(html, 'href="/colecao"');
  assertStringIncludes(html, 'aria-label="Abrir menu"');
  assertStringIncludes(html, "<svg");
  assertFalse(html.includes('class="esv-header-nav"'));
  assertFalse(html.includes("☰"));
  assertFalse(html.includes("⌕"));
});

Deno.test("transparent is explicit and solid remains the SSR default", () => {
  const transparent = renderToString(
    <EsmeraHeader
      logo="ESMÉRA"
      enquiryLabel="Carrinho"
      menu={menu}
      whatsappHref=""
      variant="transparent"
    />,
  );

  assertStringIncludes(transparent, 'data-header-variant="transparent"');
  assertStringIncludes(transparent, 'data-header-state="transparent"');
  assertFalse(transparent.includes("is-solid"));
});

Deno.test("unified header stylesheet owns shell layers without trapping fixed menu surfaces", async () => {
  const masterCss = await Deno.readTextFile("static/esmera-master.css");
  const commerceCss = await Deno.readTextFile(
    "static/esmera-commerce-refine.css",
  );
  const finishCss = await Deno.readTextFile("static/esmera-finish.css");
  const catalogCss = await Deno.readTextFile("static/esmera-catalog-v2.css");
  const headerCss = await Deno.readTextFile("static/esmera-header.css");
  const headerCssWithoutComments = headerCss.replace(/\/\*[\s\S]*?\*\//g, "");
  const app = await Deno.readTextFile("routes/_app.tsx");
  const headerIsland = await Deno.readTextFile("islands/EsmeraHeader.tsx");
  const menuIsland = await Deno.readTextFile("islands/DynamicMenu.tsx");
  const headerSection = await Deno.readTextFile("sections/Esmera/Header.tsx");
  const shellData = await Deno.readTextFile("lib/esmera/shellData.ts");

  assertStringIncludes(headerCss, ".esv-header.esv-header");
  assertStringIncludes(headerCss, ".esv-header.esv-header.is-solid");
  assertStringIncludes(headerCss, ".esv-header.esv-header.is-mega-open");
  assertStringIncludes(headerCss, '[data-header-variant="transparent"]');
  assertStringIncludes(headerCss, ".esv-header .esv-nav-v2-desktop");
  assertStringIncludes(headerCss, ".esv-header .esv-nav-v2-mobile-trigger");
  assertStringIncludes(headerCss, ".esv-mega-v2.esv-mega-v2");
  assertStringIncludes(headerCss, ".esv-mega-backdrop.esv-mega-backdrop");
  assertStringIncludes(headerCss, ".esv-nav-v2-backdrop.esv-nav-v2-backdrop");
  assertStringIncludes(headerCss, ".esv-nav-v2-drawer.esv-nav-v2-drawer");
  assertStringIncludes(headerCss, "--esv-layer-mega: 110");
  assertStringIncludes(headerCss, "--esv-layer-header: 120");
  assertStringIncludes(headerCss, "--esv-layer-overlay: 200");
  assertStringIncludes(headerCss, "--esv-layer-drawer: 210");
  assertStringIncludes(headerCss, ".esv-header.esv-header::before");
  assertStringIncludes(headerCss, "backdrop-filter: blur(12px)");
  assertStringIncludes(headerCss, "@keyframes esv-mega-v2-in");
  assertFalse(headerCssWithoutComments.includes("body:has("));

  const headerBase =
    headerCss.match(/\.esv-header\.esv-header\s*\{([^}]*)\}/)?.[1] ?? "";
  const megaOpenHeader = headerCss.match(
    /\.esv-header\.esv-header\.is-mega-open\s*\{([^}]*)\}/,
  )?.[1] ?? "";
  const megaBase =
    headerCss.match(/\.esv-mega-v2\.esv-mega-v2\s*\{([^}]*)\}/)?.[1] ?? "";
  assert(headerBase.length > 0);
  assert(megaOpenHeader.length > 0);
  assert(megaBase.length > 0);
  assertFalse(headerBase.includes("backdrop-filter"));
  assertStringIncludes(megaOpenHeader, "border-bottom: 0");
  assertStringIncludes(megaBase, "border-top: 0");

  assertStringIncludes(masterCss, "--header-h: 72px");
  assert(masterCss.match(/--header-h:/g)?.length === 1);
  assertStringIncludes(masterCss, "--ease-esmera: cubic-bezier(.16, 1, .3, 1)");
  assertFalse(masterCss.includes(".esv-header.is-scrolled"));
  assertFalse(masterCss.includes(".esv-header-nav"));
  assertFalse(masterCss.includes(".esv-header-menu"));
  assertFalse(masterCss.includes(".esv-object-taxonomy"));

  assertFalse(commerceCss.includes(".esv-header.is-scrolled"));
  assertFalse(commerceCss.includes(".esv-header-nav"));
  assertFalse(commerceCss.includes(".esv-menu-"));
  assertFalse(commerceCss.includes("--header-h:"));

  assertFalse(finishCss.includes(".esv-header {"));
  assertFalse(finishCss.includes(".esv-wordmark"));
  assertFalse(finishCss.includes("--header-h:"));

  const catalogIndex = app.indexOf("/esmera-catalog-v2.css");
  const headerIndex = app.indexOf("/esmera-header.css");
  assert(catalogIndex >= 0 && headerIndex > catalogIndex);

  assertStringIncludes(commerceCss, "body.esv-overlay-open");
  assertStringIncludes(commerceCss, "overflow-anchor: none");
  assertStringIncludes(commerceCss, ".esv-cart-quantity");
  assertStringIncludes(commerceCss, ".esv-search-field");

  assertStringIncludes(menuIsland, 'import("preact/compat")');
  assertFalse(
    menuIsland.startsWith('import { createPortal } from "preact/compat"'),
  );
  assertStringIncludes(menuIsland, 'pointerType !== "mouse"');
  assertStringIncludes(menuIsland, "const DESKTOP_OPEN_INTENT_MS = 320;");
  assertStringIncludes(menuIsland, "}, DESKTOP_OPEN_INTENT_MS);");
  assertStringIncludes(
    menuIsland,
    'type MenuPhase = "closed" | "opening" | "open" | "closing";',
  );
  assertStringIncludes(menuIsland, "key={activeDesktop.id}");
  assertStringIncludes(menuIsland, "class={`esv-mega-backdrop${");
  assertStringIncludes(
    menuIsland,
    'megaPhase === "closing" ? " is-closing" : ""',
  );
  assertStringIncludes(
    menuIsland,
    'drawerPhase === "closing" ? " is-closing" : ""',
  );
  assertFalse(menuIsland.includes("animationDelay"));
  assertStringIncludes(menuIsland, "aria-current");
  assertStringIncludes(menuIsland, 'const MEGA_ID = "esv-mega-panel"');
  assertStringIncludes(menuIsland, "aria-controls");
  assertStringIncludes(menuIsland, 'event.key !== "ArrowDown"');
  assertStringIncludes(menuIsland, 'document.addEventListener("focusin"');
  assertStringIncludes(menuIsland, "activeTriggerRef.current?.focus()");
  assertStringIncludes(menuIsland, "tabIndex={-1}");
  assertStringIncludes(menuIsland, "focusables()[0] ?? drawerRef.current");
  assertStringIncludes(menuIsland, "onDesktopHoverChange?.(true)");
  assertStringIncludes(menuIsland, "onDesktopHoverChange?.(false)");
  assertStringIncludes(menuIsland, 'event.pointerType === "mouse"');
  assertFalse(menuIsland.includes("onFocusOut="));

  assertStringIncludes(headerIsland, 'body.style.position = "fixed"');
  assertStringIncludes(headerIsland, "globalThis.scrollTo");
  assertStringIncludes(headerIsland, "setIsScrolled");
  assertStringIncludes(headerIsland, "onMegaChange={setMegaOpen}");
  assertStringIncludes(
    headerIsland,
    "onDesktopHoverChange={setDesktopMenuHovered}",
  );
  assertStringIncludes(headerIsland, "megaOpen || desktopMenuHovered");
  assertStringIncludes(headerIsland, 'megaOpen ? " is-mega-open" : ""');
  assertStringIncludes(headerIsland, "data-header-surface={headerSurface}");
  assertStringIncludes(
    app,
    'content="width=device-width, initial-scale=1, viewport-fit=cover"',
  );
  assertStringIncludes(
    headerIsland,
    'meta[name="theme-color"]',
  );
  assertStringIncludes(
    headerIsland,
    'headerSurface === "hero" ? "#111210" : "#F3F0E8"',
  );
  assertStringIncludes(headerIsland, 'overlayPhase === "closing"');
  assertStringIncludes(headerIsland, "return previous ? y > 8 : y > 24;");
  assertStringIncludes(headerIsland, "key={cartCount}");
  assertStringIncludes(headerIsland, 'class="esv-cart-quantity"');
  assertStringIncludes(headerIsland, 'class="esv-cart-remove"');
  assertStringIncludes(headerIsland, 'src="/esmera-logo.png"');
  assertStringIncludes(
    headerIsland,
    'class="esv-brand-image esv-header-logo-image"',
  );
  assertStringIncludes(headerIsland, 'width="1225"');
  assertStringIncludes(headerIsland, 'height="369"');
  assertStringIncludes(headerCss, "height: var(--esv-header-logo-h)");
  assertStringIncludes(headerCss, "justify-content: space-between");
  assertStringIncludes(headerCss, "--esv-header-group-gap:");
  assertStringIncludes(
    headerCss,
    "grid-template-columns: 44px 44px minmax(0, 1fr) 44px 44px",
  );
  assertStringIncludes(headerCss, ".esv-header .esv-header-actions {\n    display: contents;");
  assertStringIncludes(headerCss, ".esv-header .esv-search-trigger {\n    grid-column: 2;");
  assertStringIncludes(headerCss, ".esv-header .esv-wordmark {\n    grid-column: 3;");
  assertStringIncludes(headerCss, ".esv-header .esv-wishlist-header-link {\n    grid-column: 4;");
  assertStringIncludes(headerCss, ".esv-header .esv-cart-link {\n    grid-column: 5;");
  assertFalse(
    headerCss.includes(
      "minmax(88px, auto) minmax(0, 1fr) minmax(88px, auto)",
    ),
  );
  assertFalse(headerCss.includes("width: 40px;"));
  assertStringIncludes(headerCss, ".esv-header .esv-cart-label");
  assertStringIncludes(headerCss, ".esv-header .esv-cart-icon");
  assertStringIncludes(headerCss, "--esv-header-logo-h: 44px");
  assertStringIncludes(headerCss, "--esv-header-logo-h: 34px");
  assertStringIncludes(headerCss, "--esv-header-logo-h: 30px");
  assertStringIncludes(headerCss, "padding-inline: var(--page-x)");
  assertStringIncludes(headerCss, "rgba(17, 18, 16, .28)");
  assertFalse(headerCss.includes("padding-inline: 12px"));
  assertFalse(headerCss.includes(".esv-nav-v2-desktop {\n  position: static"));
  assertFalse(
    headerCss.includes(".esv-nav-v2-mobile-trigger {\n  position: static"),
  );
  assertFalse(catalogCss.includes(".esv-nav-v2-desktop{position:fixed"));
  assertFalse(catalogCss.includes(".esv-nav-v2-mobile-trigger{position:fixed"));
  assertFalse(catalogCss.includes("!important"));
  assertStringIncludes(headerIsland, "function BagIcon()");
  assertStringIncludes(headerIsland, 'class="esv-cart-icon"');
  assertStringIncludes(commerceCss, "@media (max-width: 520px)");
  assertStringIncludes(headerIsland, "<DynamicMenu");
  assertFalse(headerIsland.includes("is-scrolled"));

  assertFalse(headerSection.includes("import DynamicMenu from"));
  assertFalse(headerSection.includes("navigation?:"));
  assertFalse(headerSection.includes("categories?:"));
  assertStringIncludes(shellData, 'HeaderVariant = "transparent" | "solid"');
  assertFalse(shellData.includes("over-hero"));
});

Deno.test("hero preserves grid layout despite the main-content shell selector", async () => {
  const hero = await Deno.readTextFile("sections/Esmera/Hero.tsx");
  const carousel = await Deno.readTextFile("islands/HeroCarousel.tsx");

  assertStringIncludes(hero, 'style={{ display: "grid" }}');
  assertStringIncludes(carousel, 'style={{ display: "grid" }}');
});
