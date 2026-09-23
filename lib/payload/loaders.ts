import { getPayloadBaseURL, payloadGet } from "./client.ts";
import {
  fetchStorefrontCollection,
  fetchStorefrontProducts,
} from "../esmera/storefront.ts";
import {
  emitStorefrontDiagnostic,
  type StorefrontDiagnostic,
  type StorefrontResult,
  storefrontResult,
} from "./contract/diagnostics.ts";
import {
  type StorefrontContractKind,
  validatePayloadContract,
} from "./contract/validate.ts";
import { STOREFRONT_CONTRACT_VERSION } from "./contract/version.ts";
import { toCategory, toEsmeraObject } from "./adapters.ts";
import { resolvePayloadMedia } from "./media.ts";
import { whereContains, whereEquals, whereOr } from "./query.ts";
import type {
  EsmeraObject,
  PayloadAbout,
  PayloadCategory,
  PayloadCollectionPage,
  PayloadContact,
  PayloadHome,
  PayloadNavigation,
  PayloadPaginated,
  PayloadProduct,
  PayloadSiteSettings,
} from "./types.ts";

function unavailableDiagnostic(
  kind: string,
  error: unknown,
): StorefrontDiagnostic {
  return {
    id: `${kind}.payload_unavailable`,
    severity: "blocker",
    kind,
    message: "A fonte editorial está temporariamente indisponível.",
    suggestion: "Usar conteúdo baseline ou o último snapshot válido.",
    source: "integration",
    meta: {
      errorType: error instanceof Error ? error.name : "unknown",
    },
  };
}

export async function getPublishedGlobalResult<
  T extends { _status?: string | null },
>(
  slug: string,
  kind: StorefrontContractKind,
  depth = 1,
): Promise<StorefrontResult<T>> {
  try {
    const result = await payloadGet<T>(`globals/${slug}`, { depth });
    if (result._status === "draft") {
      const diagnostic: StorefrontDiagnostic = {
        id: `${kind}.draft_ignored`,
        severity: "warning",
        kind,
        path: "_status",
        message: "O rascunho foi ignorado no storefront público.",
        suggestion: "Publicar o documento para substituir o baseline da Deco.",
        source: "payload",
      };
      return storefrontResult(null, {
        source: "deco_baseline",
        diagnostics: [diagnostic],
        contractVersion: STOREFRONT_CONTRACT_VERSION,
        stale: false,
      });
    }

    const validation = validatePayloadContract(kind, result);
    if (!validation.compatible) {
      emitStorefrontDiagnostic(
        "payload_contract_rejected",
        validation.diagnostics,
        {
          kind,
          slug,
          contractVersion: STOREFRONT_CONTRACT_VERSION,
        },
      );
      return storefrontResult(null, {
        source: "deco_baseline",
        diagnostics: validation.diagnostics,
        contractVersion: STOREFRONT_CONTRACT_VERSION,
        stale: false,
      });
    }

    if (validation.diagnostics.length) {
      emitStorefrontDiagnostic(
        "payload_contract_warning",
        validation.diagnostics,
        {
          kind,
          slug,
          contractVersion: STOREFRONT_CONTRACT_VERSION,
        },
      );
    }
    return storefrontResult(result, {
      source: "payload_override",
      diagnostics: validation.diagnostics,
      contractVersion: STOREFRONT_CONTRACT_VERSION,
      stale: false,
    });
  } catch (error) {
    const diagnostic = unavailableDiagnostic(kind, error);
    emitStorefrontDiagnostic("payload_global_unavailable", diagnostic, {
      kind,
      slug,
      contractVersion: STOREFRONT_CONTRACT_VERSION,
    });
    return storefrontResult(null, {
      source: "unavailable",
      diagnostics: [diagnostic],
      contractVersion: STOREFRONT_CONTRACT_VERSION,
      stale: false,
    });
  }
}

export async function getPublishedGlobal<
  T extends { _status?: string | null },
>(
  slug: string,
  depth = 1,
) {
  const kind = slug === "home"
    ? "home"
    : slug === "navigation"
    ? "navigation"
    : "site-settings";
  const result = await getPublishedGlobalResult<T>(slug, kind, depth);
  return result.data;
}

export const getHomeResult = () =>
  getPublishedGlobalResult<PayloadHome>("home", "home", 2);
export const getNavigationResult = () =>
  getPublishedGlobalResult<PayloadNavigation>(
    "navigation",
    "navigation",
    2,
  );
export const getSiteSettingsResult = () =>
  getPublishedGlobalResult<PayloadSiteSettings>(
    "site-settings",
    "site-settings",
    1,
  );

export const getHome = async () => (await getHomeResult()).data;
export const getNavigation = async () => (await getNavigationResult()).data;
export const getSiteSettings = async () => (await getSiteSettingsResult()).data;
export const getAbout = () => getPublishedGlobal<PayloadAbout>("about", 2);
export const getContact = () =>
  getPublishedGlobal<PayloadContact>("contact", 2);
export async function getCollectionPage(): Promise<PayloadCollectionPage> {
  const params = new URLSearchParams({ page: "1", limit: "1" });
  const { catalog } = await fetchStorefrontProducts(params);
  return {
    title: catalog.title,
    introduction: catalog.introduction,
    visibleFilters: catalog.visibleFilters,
    emptyStateTitle: catalog.emptyStateTitle,
    emptyStateCopy: catalog.emptyStateCopy,
    callToAction: catalog.callToAction,
    seo: catalog.seo
      ? {
        ...catalog.seo,
        noindex: catalog.seo.noIndex,
        socialImage: catalog.seo.socialImage,
      }
      : null,
    _status: "published",
  };
}

export interface ProductListInput {
  limit?: number;
  page?: number;
  sort?: string;
  where?: Record<string, unknown>;
  q?: string;
  category?: string;
  material?: string;
  availability?: string;
}

function withCardCover(
  product: PayloadProduct,
  item: EsmeraObject,
): EsmeraObject {
  const cover = product.gallery?.find((media) => media.role === "cover") ??
    product.gallery?.[0];
  const card = resolvePayloadMedia(
    cover?.image,
    getPayloadBaseURL(),
    "card",
    cover?.alt,
  );
  return card ? { ...item, image: card.url, alt: card.alt || item.alt } : item;
}

async function listPayloadProducts(input: ProductListInput = {}) {
  const response = await payloadGet<PayloadPaginated<PayloadProduct>>(
    "products",
    {
      depth: 2,
      limit: Math.min(48, Math.max(1, input.limit ?? 12)),
      page: Math.max(1, input.page ?? 1),
      sort: input.sort ?? "title",
      where: input.where,
    },
  );

  const diagnostics: StorefrontDiagnostic[] = [];
  const compatibleProducts = response.docs.filter((product) => {
    const validation = validatePayloadContract("product", product);
    diagnostics.push(...validation.diagnostics);
    return validation.compatible;
  });
  if (diagnostics.length) {
    emitStorefrontDiagnostic("payload_product_filtered", diagnostics, {
      received: response.docs.length,
      compatible: compatibleProducts.length,
      contractVersion: STOREFRONT_CONTRACT_VERSION,
    });
  }

  return {
    ...response,
    docs: compatibleProducts.map((product) => {
      const item = toEsmeraObject(product);
      return item ? withCardCover(product, item) : null;
    }).filter((item): item is EsmeraObject => Boolean(item)),
  };
}

const storefrontSort: Record<string, string> = {
  editorial: "editorial",
  title: "name_asc",
  name: "name_asc",
  newest: "newest",
  "-createdAt": "newest",
  "price-asc": "price_asc",
  basePriceCents: "price_asc",
  "basePriceCents,title": "price_asc",
  "price-desc": "price_desc",
  "-basePriceCents": "price_desc",
  "-basePriceCents,title": "price_desc",
};

export function storefrontParams(input: ProductListInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(48, Math.max(1, input.limit ?? 12))));
  params.set("page", String(Math.max(1, input.page ?? 1)));
  params.set("sort", storefrontSort[input.sort ?? "editorial"] ?? "editorial");
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.category?.trim()) params.set("category", input.category.trim());
  if (input.material?.trim()) params.set("material", input.material.trim());
  if (input.availability?.trim()) {
    params.set("availability", input.availability.trim());
  }
  return params;
}

function paginatedProducts(
  response: Awaited<ReturnType<typeof fetchStorefrontProducts>>,
) {
  return { ...response.pagination, docs: response.items };
}

/** Catálogo amplo: o card recebe somente o contrato público enriquecido. */
export async function listProducts(input: ProductListInput = {}) {
  return paginatedProducts(
    await fetchStorefrontProducts(storefrontParams(input)),
  );
}

export async function getProductBySlug(slug: string) {
  if (!slug.trim()) return null;
  const result = await listPayloadProducts({
    limit: 1,
    where: whereEquals("slug", slug.trim()),
  });
  return result.docs[0] ?? null;
}

export async function listCategoriesResult(
  limit = 100,
): Promise<StorefrontResult<ReturnType<typeof toCategory>[]>> {
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
    const diagnostics: StorefrontDiagnostic[] = [];
    const data = response.docs.flatMap((category) => {
      const validation = validatePayloadContract("category", category);
      diagnostics.push(...validation.diagnostics);
      if (!validation.compatible) return [];
      const adapted = toCategory(category);
      return adapted ? [adapted] : [];
    });
    if (diagnostics.length) {
      emitStorefrontDiagnostic("payload_category_filtered", diagnostics, {
        received: response.docs.length,
        compatible: data.length,
        contractVersion: STOREFRONT_CONTRACT_VERSION,
      });
    }
    return storefrontResult(data, {
      source: "payload_override",
      diagnostics,
      contractVersion: STOREFRONT_CONTRACT_VERSION,
      stale: false,
    });
  } catch (error) {
    const diagnostic = unavailableDiagnostic("category", error);
    emitStorefrontDiagnostic("payload_categories_unavailable", diagnostic, {
      contractVersion: STOREFRONT_CONTRACT_VERSION,
    });
    return storefrontResult(null, {
      source: "unavailable",
      diagnostics: [diagnostic],
      contractVersion: STOREFRONT_CONTRACT_VERSION,
      stale: false,
    });
  }
}

export async function listCategories(limit = 100) {
  return (await listCategoriesResult(limit)).data ?? [];
}

export async function getCategoryBySlug(slug: string) {
  if (!slug.trim()) return null;
  const response = await payloadGet<PayloadPaginated<PayloadCategory>>(
    "categories",
    {
      depth: 2,
      limit: 1,
      page: 1,
      sort: "order,title",
      where: whereEquals("slug", slug.trim()),
    },
  );
  const category = response.docs[0];
  if (!category) return null;
  const validation = validatePayloadContract("category", category);
  if (!validation.compatible) {
    emitStorefrontDiagnostic(
      "payload_category_rejected",
      validation.diagnostics,
      {
        slug,
        contractVersion: STOREFRONT_CONTRACT_VERSION,
      },
    );
    return null;
  }
  return toCategory(category);
}

export async function listProductsByCategory(
  categorySlug: string,
  input: ProductListInput = {},
) {
  const response = await fetchStorefrontCollection(
    categorySlug,
    storefrontParams(input),
  );
  return { ...response.pagination, docs: response.items };
}

export async function searchProducts(search: string, limit = 8) {
  const query = search.trim().slice(0, 80);
  if (query.length < 2) return [];
  const result = await listPayloadProducts({
    limit: Math.min(12, Math.max(1, limit)),
    sort: "title",
    where: whereOr(
      whereContains("title", query),
      whereContains("subtitle", query),
      whereContains("code", query),
      whereContains("material", query),
    ),
  });
  return result.docs;
}
