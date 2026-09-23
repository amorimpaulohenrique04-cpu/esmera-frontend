import {
  buildCatalogQuery,
  hasCollectionRefinements,
} from "../../lib/payload/catalog.ts";

Deno.test("collection v2 normalizes search, filters and public sort keys", () => {
  const url = new URL(
    "https://esmera.example/colecao?q=vaso&category=lavabo&availability=available&sort=price-desc&page=2",
  );
  const query = buildCatalogQuery(
    url,
    ["category", "availability", "sort"],
    [{ id: "cat-1", title: "Lavabo", slug: "lavabo" }],
  );

  if (query.q !== "vaso") throw new Error("search was not normalized");
  if (query.category !== "lavabo") throw new Error("category was not kept");
  if (query.sort !== "price-desc") throw new Error("sort key is incorrect");
  if (query.payloadSort !== "-basePriceCents,title") {
    throw new Error("Payload sort was not mapped");
  }
  if (!query.where || !hasCollectionRefinements(query)) {
    throw new Error("filters should produce a where clause and noindex state");
  }
});

Deno.test("collection v2 ignores one-character searches", () => {
  const query = buildCatalogQuery(
    new URL("https://esmera.example/colecao?q=v"),
    ["sort"],
    [],
  );
  if (query.where) {
    throw new Error("one-character search must not query Payload");
  }
});
