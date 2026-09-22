import { assert, assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("premium footer is one compact surface and receives shell channels", async () => {
  const footer = await Deno.readTextFile("sections/Esmera/Footer.tsx");
  const layout = await Deno.readTextFile(
    "components/esmera/StorefrontLayout.tsx",
  );
  const app = await Deno.readTextFile("routes/_app.tsx");
  const css = await Deno.readTextFile("static/esmera-footer.css");

  assertStringIncludes(footer, 'class="esv-footer esv-footer-premium"');
  assertStringIncludes(footer, 'class="esv-footer-shell"');
  assertStringIncludes(footer, 'class="esv-footer-grid"');
  assertStringIncludes(footer, 'class="esv-footer-newsletter-title"');
  assertStringIncludes(footer, 'class="esv-footer-curation-badge"');
  assertStringIncludes(footer, 'class="esv-footer-socials"');
  assertStringIncludes(footer, 'class="esv-footer-bottom-bar"');
  assertEquals(footer.includes('class="esv-footer-newsletter"'), false);
  assertEquals(footer.includes("FOOTER_ART"), false);

  // O rodapé deve seguir a taxonomia publicada no backend, sem uma segunda
  // lista editorial hardcoded que possa divergir do menu principal.
  assertStringIncludes(layout, "collectionLinks={shell.categories}");
  assertStringIncludes(layout, "categoryTree={shell.menu}");
  assertStringIncludes(footer, "categoryTree?: NavigationNode[]");
  assertStringIncludes(footer, 'normalizedLabel(node.label) === "pecas"');
  assertStringIncludes(footer, ".slice(0, 6)");
  assertEquals(footer.includes("COLLECTION_ORDER"), false);
  assertEquals(footer.includes("Matéria e Registro"), false);
  assertStringIncludes(layout, "instagramHref={shell.instagramHref}");

  const aboutCss = app.indexOf("/esmera-about-page.css");
  const footerCss = app.indexOf("/esmera-footer.css");
  assert(aboutCss >= 0 && footerCss > aboutCss);
  assertStringIncludes(
    app,
    'aboutStyleRevision = "2026-09-22-about-type-v1"',
  );
  assertStringIncludes(
    app,
    'footerStyleRevision = "2026-08-15-footer-whatsapp-form-v3"',
  );

  assertStringIncludes(css, ".esv-footer.esv-footer-premium");
  assertStringIncludes(css, ".esv-footer-shell");
  assertStringIncludes(css, "padding-block: 44px 34px;");
  assertStringIncludes(css, "grid-template-columns:");
  assertStringIncludes(css, "@media (max-width: 767px)");
  assertStringIncludes(css, "@media (prefers-reduced-motion: reduce)");
});
