/**
 * Cliente da Storefront V2 API do Esméra CMS.
 *
 * O storefront passa a consumir o contrato público estável
 * (`/api/storefront/...`) em vez do schema interno do Payload (`/api/products`).
 * Isso desacopla o frontend do CMS e estabiliza o card. Ver plano técnico, §6.
 */
import { getPayloadBaseURL } from "../payload/client.ts";
import { CATALOG_MEDIA_REVISION } from "./catalogMediaRevision.ts";
import { PayloadAPIError } from "../payload/errors.ts";

export type StorefrontMediaV2 = {
  id: string;
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
};

export type StorefrontInstallmentV2 = {
  count: number;
  amountCents: number;
  interestFree: boolean;
};

export type StorefrontPricingV2 = {
  mode: "fixed" | "inquiry";
  priceCents: number | null;
  installment: StorefrontInstallmentV2 | null;
};

export type StorefrontSpecsV2 = {
  heightMm: number | null;
  widthMm: number | null;
  depthMm: number | null;
  weightGrams: number | null;
};

export type StorefrontAvailabilityStateV2 =
  | "available"
  | "made_to_order"
  | "limited"
  | "archive";

export type StorefrontProductCategoryV2 = {
  id: string;
  slug: string;
  title: string;
  taxonomyAxis?: string | null;
};

export type StorefrontProductV2 = {
  id: string;
  slug: string;
  code?: string | null;
  title: string;
  subtitle?: string | null;
  material?: string | null;
  availability?: string | null;
  price?: number | null;
  priceUnit: "cent";
  image?: StorefrontMediaV2 | null;
  hoverImage?: StorefrontMediaV2 | null;
  categories?: StorefrontProductCategoryV2[];
  // Campos estruturados do card (contrato PR2).
  identity?: {
    name: string;
    pieceType: string | null;
    material: string | null;
  };
  pieceType?: string | null;
  state?: StorefrontAvailabilityStateV2;
  isUnique?: boolean;
  purchasable?: boolean;
  specs?: StorefrontSpecsV2;
  pricing?: StorefrontPricingV2;
};

export type StorefrontCollectionV2 = {
  version: number;
  revision: string;
  category: {
    id: string;
    slug: string;
    title: string;
    eyebrow?: string | null;
    description?: string | null;
    image?: StorefrontMediaV2 | null;
    visibleFilters: string[];
    [key: string]: unknown;
  };
  items: StorefrontProductV2[];
  pagination: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    nextPage: number | null;
    hasPrevPage: boolean;
    prevPage: number | null;
  };
  facets: Record<string, unknown>;
  applied: Record<string, unknown>;
};

export type StorefrontProductsV2 =
  & Omit<
    StorefrontCollectionV2,
    "category"
  >
  & {
    catalog: {
      title: string;
      introduction?: unknown;
      visibleFilters: string[];
      emptyStateTitle?: string | null;
      emptyStateCopy?: string | null;
      callToAction?: { label: string; href: string } | null;
      seo?: {
        title?: string | null;
        description?: string | null;
        canonical?: string | null;
        noIndex?: boolean;
        socialImage?: StorefrontMediaV2 | null;
      } | null;
    };
  };

export type StorefrontProductDetailV2 = {
  version: number;
  revision: string;
  product: StorefrontProductV2 & {
    description?: unknown;
    gallery: StorefrontMediaV2[];
    seo?: unknown;
  };
};

const DEFAULT_TIMEOUT_MS = 8_000;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function assertSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new PayloadAPIError("configuration", "Slug de storefront inválido.");
  }
}

async function storefrontGet<T>(
  path: string,
  search: URLSearchParams,
  options: {
    timeoutMs?: number;
    fetcher?: typeof fetch;
    cache?: RequestCache;
  } = {},
): Promise<T> {
  if ("document" in globalThis) {
    throw new PayloadAPIError(
      "configuration",
      "O cliente storefront só pode ser executado no servidor.",
    );
  }
  const url = new URL(`/api/storefront/${path}`, getPayloadBaseURL());
  url.search = search.toString();
  // Media selection changed in the CMS. Version listing URLs so CDN responses
  // from earlier deploys cannot survive into later catalog pages.
  if (path === "products" || path.startsWith("collections/")) {
    url.searchParams.set("_cardMedia", CATALOG_MEDIA_REVISION);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const fetcher = options.fetcher ?? fetch;
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: options.cache,
    });
    if (!response.ok) {
      throw new PayloadAPIError(
        "http",
        `A Storefront API respondeu HTTP ${response.status} em ${path}.`,
        response.status,
        path,
      );
    }
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchStorefrontCollection(
  slug: string,
  params: URLSearchParams = new URLSearchParams(),
  options?: {
    fetcher?: typeof fetch;
    cache?: RequestCache;
    timeoutMs?: number;
  },
): Promise<StorefrontCollectionV2> {
  assertSlug(slug);
  return storefrontGet<StorefrontCollectionV2>(
    `collections/${slug}`,
    params,
    options,
  );
}

export function fetchStorefrontProducts(
  params: URLSearchParams = new URLSearchParams(),
  options?: {
    fetcher?: typeof fetch;
    cache?: RequestCache;
    timeoutMs?: number;
  },
): Promise<StorefrontProductsV2> {
  return storefrontGet<StorefrontProductsV2>("products", params, options);
}

export function fetchStorefrontProduct(
  slug: string,
  options?: {
    fetcher?: typeof fetch;
    cache?: RequestCache;
    timeoutMs?: number;
  },
): Promise<StorefrontProductDetailV2> {
  assertSlug(slug);
  return storefrontGet<StorefrontProductDetailV2>(
    `products/${slug}`,
    new URLSearchParams(),
    options,
  );
}
