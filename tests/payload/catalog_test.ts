import { assertEquals } from "@std/assert";
import {
  buildCatalogQuery,
  normalizeVisibleFilters,
} from "../../lib/payload/catalog.ts";

Deno.test("applies only CMS-enabled catalogue filters", () => {
  const visible = normalizeVisibleFilters([
    "categories",
    { value: "material" },
    { value: "availability" },
    { value: "sort" },
    { value: "unknown" },
  ]);
  assertEquals(visible, ["category", "material", "availability", "sort"]);
  const query = buildCatalogQuery(
    new URL(
      "https://store.example/colecao?category=mesas&material=pedra&availability=available&sort=-basePriceCents&page=2",
    ),
    visible,
    [{ id: "cat-1", title: "Mesas", slug: "mesas" }],
  );
  assertEquals(query.page, 2);
  assertEquals(query.sort, "price-desc");
  assertEquals(query.payloadSort, "-basePriceCents,title");
  assertEquals(query.materials, ["pedra"]);
  assertEquals(query.where, {
    and: [
      { categories: { contains: "cat-1" } },
      { material: { contains: "pedra" } },
      { availability: { equals: "available" } },
    ],
  });
});

Deno.test("keeps sorting functional independently from optional filters", () => {
  const query = buildCatalogQuery(
    new URL("https://store.example/colecao?sort=price-asc"),
    ["material", "availability"],
    [],
  );
  assertEquals(query.sort, "price-asc");
  assertEquals(query.payloadSort, "basePriceCents,title");
});

Deno.test("uses backend editorial order when the user does not choose a sort", () => {
  const query = buildCatalogQuery(
    new URL("https://store.example/colecao?material=pedra"),
    ["material", "sort"],
    [],
  );
  assertEquals(query.sort, "editorial");
  assertEquals(query.payloadSort, "editorial");
});

Deno.test("accepts repeated material refinements", () => {
  const query = buildCatalogQuery(
    new URL(
      "https://store.example/colecao?material=esmeralda&material=metal",
    ),
    ["material"],
    [],
  );
  assertEquals(query.materials, ["esmeralda", "metal"]);
  assertEquals(query.where, {
    or: [
      { material: { contains: "esmeralda" } },
      { material: { contains: "metal" } },
    ],
  });
});

Deno.test("ignores unsupported query values", () => {
  const query = buildCatalogQuery(
    new URL(
      "https://store.example/colecao?category=private&availability=invalid&sort=unsafe&page=-4",
    ),
    ["category", "availability", "sort"],
    [],
  );
  assertEquals(query.page, 1);
  assertEquals(query.sort, "editorial");
  assertEquals(query.payloadSort, "editorial");
  assertEquals(query.where, undefined);
});
