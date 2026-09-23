import {
  assertFalse,
  assertStringIncludes,
} from "@std/assert";

Deno.test("P1 render path keeps modal CSS and Google Fonts off the critical path", async () => {
  const [app, master, actions, modal] = await Promise.all([
    Deno.readTextFile("routes/_app.tsx"),
    Deno.readTextFile("static/esmera-master.css"),
    Deno.readTextFile("islands/ProductActions.tsx"),
    Deno.readTextFile("islands/ProductModal.tsx"),
  ]);

  assertFalse(app.includes("fonts.googleapis.com"));
  assertFalse(app.includes("fonts.gstatic.com"));
  assertStringIncludes(app, "https://cdn.jsdelivr.net");
  assertStringIncludes(master, 'font-family: "Inter";');
  assertStringIncludes(master, "font-display: swap;");
  assertStringIncludes(master, "inter@5.3.0/latin-300-normal.woff2");
  assertStringIncludes(master, "inter@5.3.0/latin-400-normal.woff2");
  assertStringIncludes(master, "inter@5.3.0/latin-500-normal.woff2");

  assertStringIncludes(app, 'name="esmera-product-modal-css"');
  assertFalse(app.includes("esmera-product-modal-refine.css"));
  assertStringIncludes(actions, "ensureProductModalStyles");
  assertStringIncludes(actions, "onPointerDown: warmDetailImage");
  assertStringIncludes(modal, "ensureProductModalStyles().then");
});
