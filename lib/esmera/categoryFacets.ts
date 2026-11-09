import type { StorefrontCategory } from "../payload/navigation.ts";

/**
 * Categories exposed as collection facets must be real storefront collections.
 * Navigation can also contain editorial pages, external destinations and
 * grouping nodes; those must never leak into the product filter.
 */
export function collectionFacetCategories(
  categories: StorefrontCategory[],
): StorefrontCategory[] {
  const seen = new Set<string>();
  return categories.filter((category) => {
    const slug = category.slug.trim();
    if (!slug || category.nodeType !== "collection" || category.external) {
      return false;
    }
    if (category.href !== `/colecao/${slug}` || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

/**
 * Catalog filters follow the published collections, not the menu: a collection
 * hidden from the menu stays filterable. Menu order comes first, and older CMS
 * builds without `catalogCategories` keep working from the menu alone.
 */
export function catalogFacetCategories(chrome: {
  categories: StorefrontCategory[];
  catalogCategories: StorefrontCategory[];
}): StorefrontCategory[] {
  return collectionFacetCategories([
    ...chrome.categories,
    ...chrome.catalogCategories,
  ]);
}
