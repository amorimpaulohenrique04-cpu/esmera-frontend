import {
  assertFalse,
  assertStringIncludes,
} from "@std/assert";

Deno.test("product modal keeps normal opens on the lean detail path", async () => {
  const actions = await Deno.readTextFile("islands/ProductActions.tsx");
  const linkSync = await Deno.readTextFile("islands/ProductModalLinkSync.tsx");
  const route = await Deno.readTextFile("routes/api/esmera-product-detail.ts");

  assertStringIncludes(
    actions,
    "`/api/esmera-product-detail?slug=${encodeURIComponent(slug)}`",
  );
  assertFalse(actions.includes("&full=1"));

  assertStringIncludes(linkSync, "&full=1");
  assertStringIncludes(
    route,
    'const includeFullProduct = url.searchParams.get("full") === "1";',
  );
  assertStringIncludes(
    route,
    "includeFullProduct ? getProductBySlug(slug) : Promise.resolve(null)",
  );
});
