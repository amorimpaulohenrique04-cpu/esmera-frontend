import { getPayloadBaseURL } from "./client.ts";
import { resolvePayloadMedia } from "./media.ts";
import { sanitizePublicHref } from "./adapters.ts";
import type {
  PayloadCategory,
  PayloadCTA,
  PayloadMedia,
  PayloadNavigation,
  Relationship,
} from "./types.ts";

export type NavigationNodeType =
  | "collection"
  | "editorial"
  | "external"
  | "group";

export interface NavigationHighlight {
  title: string;
  copy: string;
  image?: string;
  alt?: string;
  href?: string;
  label?: string;
  external: boolean;
}

export interface StorefrontCategory {
  id: string;
  title: string;
  label: string;
  slug: string;
  description: string;
  order: number;
  parentId: string | null;
  showInMenu: boolean;
  menuVisibility: NavigationVisibility;
  nodeType: NavigationNodeType;
  href: string;
  external: boolean;
  image?: { url: string; alt: string };
  highlights: NavigationHighlight[];
  seo?: PayloadCategory["seo"];
}

export type NavigationVisibility = "both" | "desktop" | "mobile";

export interface NavigationNode {
  id: string;
  label: string;
  href: string;
  external: boolean;
  visibility: NavigationVisibility;
  description?: string;
  image?: { url: string; alt: string };
  highlights: NavigationHighlight[];
  children: NavigationNode[];
}

type PayloadCategoryMenuGroup = {
  showInMenu?: boolean | null;
  label?: string | null;
  visibility?: "all" | "desktop" | "mobile" | null;
};

type PayloadCategoryV2 = PayloadCategory & {
  menu?: PayloadCategoryMenuGroup | null;
  nodeType?: NavigationNodeType | null;
  externalURL?: string | null;
  externalUrl?: string | null;
  externalHref?: string | null;
  url?: string | null;
  editorialSlug?: string | null;
  menuHighlights?:
    | Array<{
      title?: string | null;
      eyebrow?: string | null;
      copy?: string | null;
      text?: string | null;
      image?: Relationship<PayloadMedia>;
      callToAction?: PayloadCTA | null;
    }>
    | null;
};

function relationId<T extends { id: string | number }>(
  value?: Relationship<T>,
): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "object" ? String(value.id) : String(value);
}

function categoryHref(category: PayloadCategoryV2): {
  href: string;
  external: boolean;
} {
  const nodeType = category.nodeType ?? "collection";
  if (nodeType === "external") {
    const href = sanitizePublicHref(
      category.externalURL ?? category.externalUrl ?? category.externalHref ??
        category.url,
    );
    return { href, external: /^https?:\/\//i.test(href) };
  }
  if (nodeType === "editorial") {
    return {
      href: `/pagina/${category.editorialSlug?.trim() || category.slug}`,
      external: false,
    };
  }
  return { href: `/colecao/${category.slug}`, external: false };
}

function highlightFromPayload(
  item: NonNullable<PayloadCategoryV2["menuHighlights"]>[number],
  baseURL: string,
): NavigationHighlight | null {
  const title = item.title?.trim() || item.eyebrow?.trim() || "";
  const image = resolvePayloadMedia(item.image, baseURL, "card");
  const href = sanitizePublicHref(item.callToAction?.href);
  if (!title && !image) return null;
  return {
    title,
    copy: item.copy?.trim() || item.text?.trim() || "",
    image: image?.url,
    alt: image?.alt,
    href: href || undefined,
    label: item.callToAction?.label?.trim() || undefined,
    external: item.callToAction?.kind === "external" ||
      /^https?:\/\//i.test(href),
  };
}

export function toStorefrontCategory(
  input: PayloadCategory,
  baseURL = getPayloadBaseURL(),
): StorefrontCategory | null {
  const category = input as PayloadCategoryV2;
  if (category._status !== "published" || category.status !== "active") {
    return null;
  }
  const destination = categoryHref(category);
  const image = resolvePayloadMedia(category.image, baseURL, "card");
  const menu = category.menu ?? undefined;
  return {
    id: String(category.id),
    title: category.title,
    label: menu?.label?.trim() || category.title,
    slug: category.slug,
    description: category.description?.trim() ?? "",
    order: category.order ?? 100,
    parentId: relationId(category.parent),
    showInMenu: menu?.showInMenu === true,
    menuVisibility:
      menu?.visibility === "desktop" || menu?.visibility === "mobile"
        ? menu.visibility
        : "both",
    nodeType: category.nodeType ?? "collection",
    href: destination.href,
    external: destination.external,
    image: image ? { url: image.url, alt: image.alt } : undefined,
    highlights: (category.menuHighlights ?? []).flatMap((item) => {
      const highlight = highlightFromPayload(item, baseURL);
      return highlight ? [highlight] : [];
    }),
    seo: category.seo,
  };
}

function categoryReferenceIds(navigation: PayloadNavigation | null): string[] {
  return (navigation?.categoryLinks ?? []).flatMap((link) => {
    if (link.active === false) return [];
    const id = relationId(link.category);
    return id ? [id] : [];
  });
}

function toFallbackNode(
  link: PayloadCTA & { active?: boolean | null },
  index: number,
): NavigationNode | null {
  if (link.active === false) return null;
  const label = link.label?.trim() ?? "";
  const href = sanitizePublicHref(link.href);
  if (!label || !href) return null;
  return {
    id: `navigation-${index}-${href}`,
    label,
    href,
    external: link.kind === "external" || /^https?:\/\//i.test(href),
    visibility: "both",
    highlights: [],
    children: [],
  };
}

export function buildNavigationTree(
  categories: StorefrontCategory[],
  navigation: PayloadNavigation | null,
): NavigationNode[] {
  const visible = categories.filter((category) => category.showInMenu);
  const byParent = new Map<string | null, StorefrontCategory[]>();
  for (const category of visible) {
    const siblings = byParent.get(category.parentId) ?? [];
    siblings.push(category);
    byParent.set(category.parentId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) =>
      a.order - b.order || a.label.localeCompare(b.label)
    );
  }

  const buildNode = (
    category: StorefrontCategory,
    ancestry: Set<string>,
  ): NavigationNode => {
    if (ancestry.has(category.id)) {
      return {
        id: category.id,
        label: category.label,
        href: category.href,
        external: category.external,
        visibility: category.menuVisibility,
        description: category.description || undefined,
        image: category.image,
        highlights: category.highlights,
        children: [],
      };
    }
    const nextAncestry = new Set(ancestry).add(category.id);
    return {
      id: category.id,
      label: category.label,
      href: category.href,
      external: category.external,
      visibility: category.menuVisibility,
      description: category.description || undefined,
      image: category.image,
      highlights: category.highlights,
      children: (byParent.get(category.id) ?? []).map((child) =>
        buildNode(child, nextAncestry)
      ),
    };
  };

  const referenced = categoryReferenceIds(navigation);
  const naturalRoots = byParent.get(null) ?? [];
  const referencedRoots = referenced.flatMap((id) => {
    const category = visible.find((item) => item.id === id);
    return category ? [category] : [];
  });
  const referencedRootIds = new Set(
    referencedRoots.map((category) => category.id),
  );
  const roots = referenced.length > 0
    ? [
      ...referencedRoots,
      ...naturalRoots.filter((category) => !referencedRootIds.has(category.id)),
    ]
    : naturalRoots;

  const categoryNodes = roots.map((category) => buildNode(category, new Set()));
  if (categoryNodes.length > 0) return categoryNodes;

  return [
    ...(navigation?.mainLinks ?? []),
    ...(navigation?.utilityLinks ?? []),
  ].flatMap((link, index) => {
    const node = toFallbackNode(link, index);
    return node ? [node] : [];
  });
}
