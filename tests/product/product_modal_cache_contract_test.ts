import { assertFalse, assertStringIncludes } from "@std/assert";

Deno.test("product modal has one revisioned stylesheet with no override layers", async () => {
  const app = await Deno.readTextFile("routes/_app.tsx");
  const css = await Deno.readTextFile("static/esmera-product-modal.css");

  assertStringIncludes(app, 'const storefrontStyleRevision = "');
  assertStringIncludes(
    app,
    "/esmera-product-modal.css?v=${storefrontStyleRevision}",
  );
  assertFalse(app.includes("esmera-product-modal-v2.css"));
  assertFalse(app.includes("esmera-product-modal-frame-fix.css"));
  assertFalse(app.includes("esmera-product-media-v16.css"));
  assertFalse(app.includes("esmera-hotfix-product-modal.css"));
  assertFalse(css.includes("!important"));
  assertFalse(css.includes("--esv-modal-gallery-ratio"));
  assertStringIncludes(css, "aspect-ratio: 3 / 2;");
  assertStringIncludes(css, "aspect-ratio: 1 / 1;");
  assertStringIncludes(css, "--esv-stage-inset:");
  assertStringIncludes(css, "--esv-gallery-pair-gap: 0px;");
  assertStringIncludes(css, ".esv-product-viewer-stage");
  assertStringIncludes(css, "touch-action: none;");
});
