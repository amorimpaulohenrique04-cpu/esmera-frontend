import {
  assert,
  assertFalse,
  assertStringIncludes,
} from "@std/assert";

Deno.test("P1/P3 render path keeps modal CSS and third-party fonts off the critical path", async () => {
  const [app, critical, actions, modal] = await Promise.all([
    Deno.readTextFile("routes/_app.tsx"),
    Deno.readTextFile("static/esmera-critical.css"),
    Deno.readTextFile("islands/ProductActions.tsx"),
    Deno.readTextFile("islands/ProductModal.tsx"),
  ]);

  assertFalse(app.includes("fonts.googleapis.com"));
  assertFalse(app.includes("fonts.gstatic.com"));
  assertFalse(app.includes("cdn.jsdelivr.net"));
  assertFalse(critical.includes("cdn.jsdelivr.net"));

  assertStringIncludes(critical, 'font-family: "Inter";');
  assertStringIncludes(critical, "font-display: swap;");
  for (const weight of [300, 400, 500]) {
    const path = `static/fonts/inter-latin-${weight}-normal.woff2`;
    assert(await Deno.stat(path));
    assertStringIncludes(
      critical,
      `/fonts/inter-latin-${weight}-normal.woff2`,
    );
  }

  assertStringIncludes(app, 'name="esmera-product-modal-css"');
  assertFalse(app.includes("esmera-product-modal-refine.css"));
  assertStringIncludes(actions, "ensureProductModalStyles");
  assertStringIncludes(actions, "onPointerDown: warmDetailImage");
  assertStringIncludes(modal, "ensureProductModalStyles().then");
});
