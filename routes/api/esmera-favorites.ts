import type { Handlers } from "$fresh/server.ts";
import { toEsmeraObject } from "../../lib/payload/adapters.ts";
import { payloadGet } from "../../lib/payload/client.ts";
import { whereEquals, whereOr } from "../../lib/payload/query.ts";
import type {
  PayloadPaginated,
  PayloadProduct,
} from "../../lib/payload/types.ts";

const MAX_FAVORITES = 40;

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const rawIds = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const ids = [...new Set(rawIds)].slice(0, MAX_FAVORITES);
    if (ids.length === 0) {
      return Response.json({ items: [] }, {
        headers: { "cache-control": "no-store" },
      });
    }

    try {
      const response = await payloadGet<PayloadPaginated<PayloadProduct>>(
        "products",
        {
          depth: 2,
          limit: ids.length,
          page: 1,
          where: whereOr(...ids.map((id) => whereEquals("id", id))),
          cache: "no-store",
        },
      );

      const byId = new Map(
        response.docs
          .map((product) => toEsmeraObject(product))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => [item.id, item]),
      );

      const items = ids
        .map((id) => byId.get(String(id)))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      return Response.json({ items }, {
        headers: { "cache-control": "no-store" },
      });
    } catch {
      return Response.json({
        error: {
          code: "favorites_unavailable",
          message: "Não foi possível carregar seus favoritos agora.",
        },
      }, {
        status: 502,
        headers: { "cache-control": "no-store" },
      });
    }
  },
};
