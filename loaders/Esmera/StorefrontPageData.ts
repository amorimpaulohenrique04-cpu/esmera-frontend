import { payloadGet } from "../../lib/payload/client.ts";
import { PayloadAPIError } from "../../lib/payload/errors.ts";
import { createShellCache } from "../../lib/payload/shellCache.ts";
import type { StorefrontCategory } from "../../lib/payload/navigation.ts";
import type {
  PayloadHome,
  PayloadSiteSettings,
} from "../../lib/payload/types.ts";

export const cache = { maxAge: 15 };
export const cacheKey = () => "storefront-page-data-v3";

type PublicMedia = {
  url?: string | null;
  alt?: string | null;
};

type PublicNavigationHighlight = {
  title?: string | null;
  description?: string | null;
  image?: PublicMedia | null;
  href?: string | null;
  linkLabel?: string | null;
};

type PublicNavigationNode = {
  id: string;
  title: string;
  label: string;
  slug: string;
  nodeType: "collection" | "editorial" | "external" | "group";
  href?: string | null;
  externalURL?: string | null;
  visibility?: "all" | "desktop" | "mobile" | null;
  children?: PublicNavigationNode[];
  highlights?: PublicNavigationHighlight[];
};

type PublicCatalogCategory = {
  id: string | number;
  title: string;
  slug: string;
  parentId?: string | number | null;
  order?: number | null;
};

export type StorefrontBootstrap = {
  version: 1;
  home: PayloadHome | null;
  siteSettings: PayloadSiteSettings | null;
  navigation: {
    roots?: PublicNavigationNode[];
  };
  /** Every published collection, in or out of the menu. Absent on older CMS builds. */
  catalogCategories?: PublicCatalogCategory[];
  revision?: string | null;
};

type PageData = {
  home: PayloadHome | null;
  navigation: null;
  siteSettings: PayloadSiteSettings | null;
  categories: StorefrontCategory[];
  catalogCategories: StorefrontCategory[];
  revision: string | null;
  unavailable: string[];
  stale: boolean;
};

// With Cloudflare's max-age=30 + stale-while-revalidate=15 (routes/_middleware.ts)
// a publication reaches every visitor in at most about one minute.
const FRESH_MS = 15_000;
const REFRESH_WAIT_MS = 1_500;
// Long enough for a CMS cold start; the visitor is only held for REFRESH_WAIT_MS.
const REFRESH_TIMEOUT_MS = 6_000;
const RETRY_AFTER_FAILURE_MS = 10_000;

function visibility(
  value?: PublicNavigationNode["visibility"],
): StorefrontCategory["menuVisibility"] {
  return value === "desktop" || value === "mobile" ? value : "both";
}

function flattenNavigation(
  nodes: PublicNavigationNode[] = [],
  parentId: string | null = null,
  orderBase = 0,
): StorefrontCategory[] {
  return nodes.flatMap((node, index) => {
    const href = node.href?.trim() || node.externalURL?.trim() ||
      (node.nodeType === "editorial"
        ? `/pagina/${node.slug}`
        : `/colecao/${node.slug}`);
    const category: StorefrontCategory = {
      id: String(node.id),
      title: node.title,
      label: node.label || node.title,
      slug: node.slug,
      description: "",
      order: orderBase + (index + 1) * 100,
      parentId,
      showInMenu: true,
      menuVisibility: visibility(node.visibility),
      nodeType: node.nodeType,
      href,
      external: /^https?:\/\//i.test(href),
      highlights: (node.highlights ?? []).map((item) => ({
        title: item.title?.trim() || "",
        copy: item.description?.trim() || "",
        image: item.image?.url || undefined,
        alt: item.image?.alt || undefined,
        href: item.href || undefined,
        label: item.linkLabel || undefined,
        external: /^https?:\/\//i.test(item.href ?? ""),
      })),
    };

    return [
      category,
      ...flattenNavigation(
        node.children ?? [],
        category.id,
        category.order * 100,
      ),
    ];
  });
}

function catalogCategory(item: PublicCatalogCategory): StorefrontCategory {
  return {
    id: String(item.id),
    title: item.title,
    label: item.title,
    slug: item.slug,
    description: "",
    order: item.order ?? 0,
    parentId: item.parentId === null || item.parentId === undefined
      ? null
      : String(item.parentId),
    showInMenu: false,
    menuVisibility: "both",
    nodeType: "collection",
    href: `/colecao/${item.slug}`,
    external: false,
    highlights: [],
  };
}

export function pageDataFromBootstrap(
  bootstrap: StorefrontBootstrap,
): PageData {
  // A malformed 200 must count as a failure, or it would replace the last
  // valid menu with an empty one.
  if (!Array.isArray(bootstrap?.navigation?.roots)) {
    throw new PayloadAPIError(
      "invalid-response",
      "O bootstrap da vitrine veio sem a navegação.",
      undefined,
      "/api/storefront/bootstrap",
    );
  }
  return {
    home: bootstrap.home,
    navigation: null,
    siteSettings: bootstrap.siteSettings,
    categories: flattenNavigation(bootstrap.navigation.roots),
    catalogCategories: (bootstrap.catalogCategories ?? []).map(catalogCategory),
    revision: bootstrap.revision ?? null,
    unavailable: [],
    stale: false,
  };
}

async function fetchPageData(): Promise<PageData> {
  const bootstrap = await payloadGet<StorefrontBootstrap>(
    "storefront/bootstrap",
    { timeoutMs: REFRESH_TIMEOUT_MS, maxRetries: 0 },
  );
  return pageDataFromBootstrap(bootstrap);
}

const shellCache = createShellCache<PageData>({
  load: fetchPageData,
  revisionOf: (value) => value.revision,
  freshMs: FRESH_MS,
  waitMs: REFRESH_WAIT_MS,
  retryAfterFailureMs: RETRY_AFTER_FAILURE_MS,
  onRefreshFailure: (failure) => {
    console.error(JSON.stringify({
      event: "storefront_shell_refresh_failed",
      ...failure,
    }));
  },
});

export const storefrontShellStatus = shellCache.status;
export const storefrontShellDegradedSince = shellCache.degradedSince;

export default async function StorefrontPageData(): Promise<PageData> {
  const result = await shellCache.read();
  if (result) {
    return result.stale ? { ...result.value, stale: true } : result.value;
  }
  return {
    home: null,
    navigation: null,
    siteSettings: null,
    categories: [],
    catalogCategories: [],
    revision: null,
    unavailable: ["home", "shell"],
    stale: false,
  };
}
