import { whereAnd, whereContains, whereEquals, whereOr } from "./query.ts";

export type CatalogFilter = "category" | "material" | "availability" | "sort";
export type CollectionSort =
  | "editorial"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name";

const availabilityValues = new Set([
  "unique",
  "available",
  "made_to_order",
  "limited",
  "archive",
]);

const sortAliases: Record<string, CollectionSort> = {
  editorial: "editorial",
  newest: "newest",
  "price-asc": "price-asc",
  "price-desc": "price-desc",
  name: "name",
  title: "name",
  "-title": "name",
  basePriceCents: "price-asc",
  "-basePriceCents": "price-desc",
  createdAt: "newest",
  "-createdAt": "newest",
};

const payloadSortByCollectionSort: Record<CollectionSort, string> = {
  editorial: "editorial",
  newest: "-createdAt",
  "price-asc": "basePriceCents,title",
  "price-desc": "-basePriceCents,title",
  name: "title",
};

export function normalizeVisibleFilters(
  filters?: Array<string | { value?: string | null }> | null,
): CatalogFilter[] {
  return (filters ?? []).flatMap<CatalogFilter>((filter) => {
    const value = (typeof filter === "string" ? filter : filter.value)
      ?.toLowerCase();
    if (value === "category" || value === "categories") return ["category"];
    if (value === "material") return ["material"];
    if (value === "availability") return ["availability"];
    if (value === "sort" || value === "sorting") return ["sort"];
    return [];
  }).filter((filter, index, all) => all.indexOf(filter) === index);
}

export interface CatalogCategory {
  id: string;
  title: string;
  slug: string;
}

export interface CatalogQueryState {
  page: number;
  q: string;
  sort: CollectionSort;
  payloadSort: string;
  category: string;
  materials: string[];
  availability: string;
  where?: Record<string, unknown>;
}

export function normalizeCollectionSort(value?: string | null): CollectionSort {
  return sortAliases[value?.trim() ?? ""] ?? "editorial";
}

function queryValues(
  params: URLSearchParams,
  name: string,
  maxItems = 12,
): string[] {
  return [
    ...new Set(
      params.getAll(name)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim().slice(0, 80))
        .filter(Boolean),
    ),
  ].slice(0, maxItems);
}

export function buildCatalogQuery(
  url: URL,
  visibleFilters: CatalogFilter[],
  categories: CatalogCategory[],
  fixedCategoryID?: string,
): CatalogQueryState {
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const q = url.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const materials = visibleFilters.includes("material")
    ? queryValues(url.searchParams, "material")
    : [];
  const availabilityCandidate = visibleFilters.includes("availability")
    ? (url.searchParams.get("availability")?.trim() ?? "")
    : "";
  const availability = availabilityValues.has(availabilityCandidate)
    ? availabilityCandidate
    : "";
  const categoryCandidate = visibleFilters.includes("category")
    ? (url.searchParams.get("category")?.trim() ?? "")
    : "";
  const category = categories.some((item) => item.slug === categoryCandidate)
    ? categoryCandidate
    : "";
  const categoryID = fixedCategoryID ||
    categories.find((item) => item.slug === category)?.id;
  // Sorting is a collection control rendered independently from the optional
  // refinement fields. If it is visible in the UI, its query must always be
  // honored by SSR and by /api/esmera-collection.
  const sort = normalizeCollectionSort(url.searchParams.get("sort"));
  const searchCondition = q.length >= 2
    ? whereOr(
      whereContains("title", q),
      whereContains("subtitle", q),
      whereContains("code", q),
      whereContains("material", q),
      whereContains("searchTerms.term", q),
    )
    : null;
  const materialConditions = materials.map((material) =>
    whereContains("material", material)
  );
  const materialCondition = materialConditions.length === 0
    ? null
    : materialConditions.length === 1
    ? materialConditions[0]
    : whereOr(...materialConditions);
  const conditions = [
    categoryID ? whereContains("categories", categoryID) : null,
    materialCondition,
    availability ? whereEquals("availability", availability) : null,
    searchCondition,
  ].filter((condition): condition is Record<string, unknown> =>
    Boolean(condition)
  );
  return {
    page,
    q,
    sort,
    payloadSort: payloadSortByCollectionSort[sort],
    category,
    materials,
    availability,
    where: conditions.length === 0
      ? undefined
      : conditions.length === 1
      ? conditions[0]
      : whereAnd(...conditions),
  };
}

export function hasCollectionRefinements(query: CatalogQueryState): boolean {
  return query.page > 1 || query.q.length >= 2 || Boolean(
    query.category || query.materials.length || query.availability ||
      query.sort !== "editorial",
  );
}
