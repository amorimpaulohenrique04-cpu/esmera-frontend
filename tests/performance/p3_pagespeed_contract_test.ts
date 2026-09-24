import { assert, assertFalse, assertStringIncludes } from "@std/assert";

Deno.test("P3 owns first paint in one canonical critical stylesheet", async () => {
  const app = await Deno.readTextFile("routes/_app.tsx");
  const critical = await Deno.readTextFile("static/esmera-critical.css");

  assertStringIncludes(app, 'id="esmera-critical"');
  assertStringIncludes(app, "CRITICAL_CSS");
  assertStringIncludes(app, 'data-esmera-deferred-style="true"');
  assertStringIncludes(app, "DEFERRED_STYLE_BOOTSTRAP");
  assertFalse(
    app.includes(
      'rel="stylesheet"\n          href={asset(`/esmera-critical.css',
    ),
  );
  assertFalse(app.includes("cdn.jsdelivr.net"));
  assertStringIncludes(app, 'rel="preload"\n          as="style"');
  assertStringIncludes(app, "esmera-product-modal.css");
  assertFalse(
    app.includes('rel="stylesheet"\n          href={asset(\`/esmera-product-modal.css'),
  );

  assertStringIncludes(critical, ".esv-hero");
  assertStringIncludes(critical, ".esv-header");
  assertStringIncludes(critical, "/fonts/inter-latin-300-normal.woff2");
  assertFalse(critical.includes("cdn.jsdelivr.net"));
});

Deno.test("P3 moves critical selectors instead of duplicating overrides", async () => {
  for (
    const path of [
      "static/esmera-finish.css",
      "static/esmera-home-art-direction-v2.css",
      "static/esmera-home-length-refinement-v3.css",
      "static/esmera-motion-v2.css",
    ]
  ) {
    const css = await Deno.readTextFile(path);
    assertFalse(css.includes(".esv-hero"), `${path} still owns hero selectors`);
  }

  const shell = await Deno.readTextFile("static/esmera-shell-cro-v1.css");
  const mobile = await Deno.readTextFile(
    "static/esmera-mobile-recovery-v4.css",
  );
  assertFalse(shell.includes(".esv-hero"));
  assertFalse(mobile.includes(".esv-hero"));
  assertFalse(mobile.includes(".esv-header.esv-header"));
});

Deno.test("P3 vendors Inter as same-origin static assets", async () => {
  const critical = await Deno.readTextFile("static/esmera-critical.css");

  for (const weight of [300, 400, 500]) {
    const path = `static/fonts/inter-latin-${weight}-normal.woff2`;
    const stat = await Deno.stat(path);
    assert(stat.isFile);
    assert(stat.size > 20_000);
    assertStringIncludes(
      critical,
      `/fonts/inter-latin-${weight}-normal.woff2`,
    );
  }
});

Deno.test("P3 serves smaller responsive image candidates without duplicate hero preload", async () => {
  const media = await Deno.readTextFile(
    "components/esmera/ResponsiveMedia.tsx",
  );
  const carousel = await Deno.readTextFile("islands/HeroCarousel.tsx");

  assertStringIncludes(media, "384,");
  assertStringIncludes(media, "414,");
  assertStringIncludes(media, "512,");
  assertStringIncludes(carousel, "compact ? 750 : 1800");
  assertFalse(carousel.includes('rel="preload"'));
});

Deno.test("P3 removes the synchronous reveal geometry read", async () => {
  const motion = await Deno.readTextFile("islands/EsmeraMotion.tsx");
  assertFalse(motion.includes("getBoundingClientRect"));
  assertFalse(motion.includes("offsetWidth"));
  assertFalse(motion.includes("offsetHeight"));
  assertStringIncludes(motion, "No synchronous geometry read");
});

Deno.test("P3 optimizes the header wordmark instead of shipping the full PNG", async () => {
  const header = await Deno.readTextFile("islands/EsmeraHeader.tsx");
  assertStringIncludes(header, "apps/website/components/Image.tsx");
  assertStringIncludes(header, "HEADER_LOGO_SOURCE");
  assertStringIncludes(header, "width={160}");
  assertStringIncludes(
    header,
    'sizes="(max-width: 767px) 100px',
  );
  assertFalse(header.includes('width="1225"'));
});
