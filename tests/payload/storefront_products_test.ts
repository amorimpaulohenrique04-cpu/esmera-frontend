import { assertEquals } from "@std/assert";
import { CATALOG_MEDIA_REVISION } from "../../lib/esmera/catalogMediaRevision.ts";
import { toProductGallery } from "../../lib/payload/adapters.ts";
import type { PayloadProduct } from "../../lib/payload/types.ts";
import {
  fetchStorefrontProducts,
  type StorefrontProductsV2,
} from "../../lib/esmera/storefront.ts";

Deno.test("requests the enriched root catalog with filters", async () => {
  const previous = Deno.env.get("PAYLOAD_API_URL");
  let requested = "";
  try {
    Deno.env.set("PAYLOAD_API_URL", "https://cms.example.com");
    const response: StorefrontProductsV2 = {
      version: 2,
      revision: "catalog-revision",
      catalog: { title: "Coleções", visibleFilters: ["material", "price"] },
      items: [],
      pagination: {
        page: 2,
        limit: 24,
        totalDocs: 0,
        totalPages: 0,
        hasNextPage: false,
        nextPage: null,
        hasPrevPage: false,
        prevPage: null,
      },
      facets: {},
      applied: {},
    };
    const params = new URLSearchParams({
      page: "2",
      limit: "24",
      piece_type: "pulseiras",
    });

    const result = await fetchStorefrontProducts(params, {
      fetcher: (input) => {
        requested = String(input);
        return Promise.resolve(Response.json(response));
      },
    });

    assertEquals(result.revision, "catalog-revision");
    assertEquals(
      requested,
      `https://cms.example.com/api/storefront/products?page=2&limit=24&piece_type=pulseiras&_cardMedia=${CATALOG_MEDIA_REVISION}`,
    );
  } finally {
    if (previous === undefined) Deno.env.delete("PAYLOAD_API_URL");
    else Deno.env.set("PAYLOAD_API_URL", previous);
  }
});

Deno.test("paginated collections and load-more use the same new media revision", async () => {
  const previous = Deno.env.get("PAYLOAD_API_URL");
  let requested = "";
  try {
    Deno.env.set("PAYLOAD_API_URL", "https://cms.example.com");
    const { fetchStorefrontCollection } = await import(
      "../../lib/esmera/storefront.ts"
    );
    await fetchStorefrontCollection(
      "pecas",
      new URLSearchParams({ page: "3", limit: "24" }),
      {
        fetcher: (input) => {
          requested = String(input);
          return Promise.resolve(Response.json({ version: 2, items: [] }));
        },
      },
    );

    const url = new URL(requested);
    assertEquals(url.pathname, "/api/storefront/collections/pecas");
    assertEquals(url.searchParams.get("page"), "3");
    assertEquals(url.searchParams.get("_cardMedia"), CATALOG_MEDIA_REVISION);

    const explorer = await Deno.readTextFile(
      new URL("../../islands/CollectionExplorer.tsx", import.meta.url),
    );
    assertEquals(
      explorer.includes(
        'endpoint.searchParams.set("_cardMedia", CATALOG_MEDIA_REVISION)',
      ),
      true,
    );
  } finally {
    if (previous === undefined) Deno.env.delete("PAYLOAD_API_URL");
    else Deno.env.set("PAYLOAD_API_URL", previous);
  }
});

Deno.test("ObjectCard consumes Storefront and keeps the resolved Home fallback", async () => {
  const source = await Deno.readTextFile(
    new URL("../../components/esmera/ObjectCard.tsx", import.meta.url),
  );
  assertEquals(source.includes("toProductCardViewModel(item)"), true);
  assertEquals(source.includes("esmeraObjectToCardViewModel(item)"), true);
});

Deno.test("product gallery exposes derivative and original dimensions", () => {
  const product = {
    gallery: [{
      image: {
        id: 10,
        url: "/media/original.jpg",
        width: 1200,
        height: 1600,
        alt: "Objeto",
        _status: "published",
        sizes: {
          gallery: { url: "/media/gallery.jpg", width: 1350, height: 1800 },
        },
      },
      alt: "Objeto na galeria",
      mediaKey: "cover-main",
      role: "cover",
    }],
  } as PayloadProduct;
  const [media] = toProductGallery(product, "https://cms.example.com");
  assertEquals(media.width, 1350);
  assertEquals(media.height, 1800);
  assertEquals(media.fullWidth, 1200);
  assertEquals(media.fullHeight, 1600);
  assertEquals(media.fullUrl, "https://cms.example.com/media/original.jpg");
  assertEquals(media.key, "cover-main");
  assertEquals(media.role, "cover");
});
