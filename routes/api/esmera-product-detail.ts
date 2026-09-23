import type { Handlers } from "$fresh/server.ts";
import { storefrontDetailToModalMedia } from "../../lib/esmera/productDetail.ts";
import { fetchStorefrontProduct } from "../../lib/esmera/storefront.ts";
import { getProductBySlug } from "../../lib/payload/loaders.ts";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim() ?? "";
    const includeFullProduct = url.searchParams.get("full") === "1";

    if (!SLUG_PATTERN.test(slug)) {
      return Response.json({ error: "invalid_product_slug" }, {
        status: 400,
        headers: { "cache-control": "no-store" },
      });
    }

    try {
      const [detail, fullProduct] = await Promise.all([
        fetchStorefrontProduct(slug, { cache: "no-store" }),
        includeFullProduct ? getProductBySlug(slug) : Promise.resolve(null),
      ]);
      const product = storefrontDetailToModalMedia(detail);
      if (!product) {
        return Response.json({ error: "product_media_unavailable" }, {
          status: 502,
          headers: { "cache-control": "no-store" },
        });
      }

      return Response.json(
        includeFullProduct ? { product, fullProduct } : { product },
        {
          headers: {
            "cache-control":
              "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    } catch {
      return Response.json({ error: "product_detail_unavailable" }, {
        status: 502,
        headers: { "cache-control": "no-store" },
      });
    }
  },
};
