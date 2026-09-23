import { payloadGet } from "./client.ts";
import { whereEquals } from "./query.ts";
import { toStorefrontCategory } from "./navigation.ts";
import type { PayloadCategory, PayloadPaginated } from "./types.ts";

export async function listStorefrontCategories(limit = 100) {
  try {
    const response = await payloadGet<PayloadPaginated<PayloadCategory>>(
      "categories",
      {
        depth: 2,
        limit: Math.min(100, Math.max(1, limit)),
        page: 1,
        sort: "order,title",
      },
    );
    return response.docs.flatMap((category) => {
      const adapted = toStorefrontCategory(category);
      return adapted ? [adapted] : [];
    });
  } catch {
    return [];
  }
}

export async function getStorefrontCategoryBySlug(slug: string) {
  const normalized = slug.trim();
  if (!normalized) return null;
  try {
    const response = await payloadGet<PayloadPaginated<PayloadCategory>>(
      "categories",
      {
        depth: 2,
        limit: 1,
        page: 1,
        sort: "order,title",
        where: whereEquals("slug", normalized),
      },
    );
    return response.docs[0] ? toStorefrontCategory(response.docs[0]) : null;
  } catch {
    return null;
  }
}
