import type { Handlers } from "$fresh/server.ts";
import { collectionFacetCategories } from "../../lib/esmera/categoryFacets.ts";
import {
  buildCatalogQuery,
  type CatalogFilter,
} from "../../lib/payload/catalog.ts";
import {
  listProducts,
  listProductsByCategory,
} from "../../lib/payload/loaders.ts";
import { getPageChrome } from "../../lib/payload/pageData.ts";

const CATALOG_FILTERS: CatalogFilter[] = [
  "category",
  "material",
  "availability",
  "sort",
];
const COLLECTION_FILTERS: CatalogFilter[] = [
  "material",
  "availability",
  "sort",
];

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim() ?? "";

    try {
      // The shell is only needed to validate a category refinement on the
      // catalog root. Collection-by-slug filtering needs no extra CMS read.
      const categoryRefinement = !slug &&
        Boolean(url.searchParams.get("category")?.trim());
      const categories = categoryRefinement
        ? collectionFacetCategories((await getPageChrome()).categories)
        : [];
      const query = buildCatalogQuery(
        url,
        slug ? COLLECTION_FILTERS : CATALOG_FILTERS,
        categories,
      );
      const common = {
        limit: 24,
        page: query.page,
        sort: query.payloadSort,
        q: query.q.length >= 2 ? query.q : undefined,
        category: query.category || undefined,
        material: query.materials.length
          ? query.materials.join(",")
          : undefined,
        availability: query.availability || undefined,
      };

      const result = slug
        ? await listProductsByCategory(slug, common)
        : await listProducts(common);

      return Response.json({
        items: result.docs,
        pagination: {
          page: result.page,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          hasNextPage: result.hasNextPage,
          nextPage: result.nextPage,
        },
        applied: {
          q: query.q,
          category: query.category,
          materials: query.materials,
          availability: query.availability,
          sort: query.sort,
        },
      }, {
        headers: {
          "cache-control":
            "public, max-age=15, s-maxage=45, stale-while-revalidate=120",
          "content-type": "application/json; charset=utf-8",
        },
      });
    } catch {
      return Response.json({ error: "collection_unavailable" }, {
        status: 502,
        headers: { "cache-control": "no-store" },
      });
    }
  },
};
