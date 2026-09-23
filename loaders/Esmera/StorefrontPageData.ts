import { payloadGet } from "../../lib/payload/client.ts";
import type { StorefrontCategory } from "../../lib/payload/navigation.ts";
import type {
  PayloadHome,
  PayloadSiteSettings,
} from "../../lib/payload/types.ts";

export const cache = { maxAge: 300 };
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

type StorefrontBootstrap = {
  version: 1;
  home: PayloadHome | null;
  siteSettings: PayloadSiteSettings | null;
  navigation: {
    roots?: PublicNavigationNode[];
  };
};

type PageData = {
  home: PayloadHome | null;
  navigation: null;
  siteSettings: PayloadSiteSettings | null;
  categories: StorefrontCategory[];
  unavailable: string[];
  stale: boolean;
};

type CacheEntry = {
  value: PageData;
  expiresAt: number;
  staleUntil: number;
};

const FRESH_MS = 300_000;
const STALE_MS = 3_600_000;
let cached: CacheEntry | null = null;
let inFlight: Promise<PageData> | null = null;

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

async function fetchPageData(): Promise<PageData> {
  const bootstrap = await payloadGet<StorefrontBootstrap>(
    "storefront/bootstrap",
    { timeoutMs: 1_800, maxRetries: 0 },
  );
  return {
    home: bootstrap.home,
    navigation: null,
    siteSettings: bootstrap.siteSettings,
    categories: flattenNavigation(bootstrap.navigation?.roots ?? []),
    unavailable: [],
    stale: false,
  };
}

async function refreshPageData(): Promise<PageData> {
  if (inFlight) return await inFlight;
  inFlight = fetchPageData().then((value) => {
    const now = Date.now();
    cached = {
      value,
      expiresAt: now + FRESH_MS,
      staleUntil: now + STALE_MS,
    };
    return value;
  }).finally(() => {
    inFlight = null;
  });
  return await inFlight;
}

export default async function StorefrontPageData(): Promise<PageData> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  // Stale-while-revalidate inside the Deco worker: visitors never wait for the
  // CMS refresh while a last-known-good shell/Home snapshot is available.
  if (cached && cached.staleUntil > now) {
    void refreshPageData().catch(() => undefined);
    return { ...cached.value, stale: true };
  }

  try {
    return await refreshPageData();
  } catch {
    if (cached) return { ...cached.value, stale: true };
    return {
      home: null,
      navigation: null,
      siteSettings: null,
      categories: [],
      unavailable: ["home", "shell"],
      stale: false,
    };
  }
}
