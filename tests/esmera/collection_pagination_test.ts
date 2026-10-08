import { assertEquals } from "@std/assert";
import {
  collectionPageHref,
  collectionPageItems,
} from "../../lib/esmera/collectionPagination.ts";

Deno.test("collection pages include endpoints and current page", () => {
  assertEquals(collectionPageItems(3, 5), [1, 2, 3, 4, 5]);
  assertEquals(collectionPageItems(1, 1), [1]);
  assertEquals(collectionPageItems(1, 0), []);
  assertEquals(collectionPageItems(5, 20), [
    1, 2, 3, 4, 5, 6, "ellipsis", 19, 20,
  ]);
  assertEquals(collectionPageItems(20, 20), [
    1, 2, "ellipsis", 18, 19, 20,
  ]);
});

Deno.test("collection links preserve filters and remove page=1", () => {
  const params = new URLSearchParams(
    "material=jadeita&material=dolomita&sort=price-asc&q=vaso&page=3",
  );
  assertEquals(
    collectionPageHref("/colecao/decoracao?old=1", params, 2),
    "/colecao/decoracao?material=jadeita&material=dolomita&sort=price-asc&q=vaso&page=2#esv-collection-results",
  );
  assertEquals(
    collectionPageHref("/colecao/decoracao", params, 1),
    "/colecao/decoracao?material=jadeita&material=dolomita&sort=price-asc&q=vaso#esv-collection-results",
  );
});
