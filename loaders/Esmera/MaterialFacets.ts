import {
  fetchStorefrontCollection,
  fetchStorefrontProducts,
} from "../../lib/esmera/storefront.ts";

export interface MaterialFacet {
  /** Stable value exposed in the collection URL/UI and sent to Storefront V2. */
  value: string;
  label: string;
  count: number;
  /** Values sent to the public API for this facet. Kept as an array for compatibility. */
  queryValues: string[];
  /** Original free-text values returned by the current CMS facets. */
  sourceValues: string[];
}

export interface Props {
  slug?: string;
  limit?: number;
}

interface MaterialRule {
  value: string;
  label: string;
  aliases: string[];
}

/**
 * Public vocabulary for material refinement.
 *
 * `Products.material` is intentionally still editorial/free text in the CMS.
 * The storefront must not leak those whole descriptions as filter options, so
 * this boundary projects the common material nouns into stable public facets.
 */
const MATERIAL_RULES: MaterialRule[] = [
  { value: "esmeralda", label: "Esmeralda", aliases: ["esmeralda"] },
  { value: "bege-bahia", label: "Bege Bahia", aliases: ["bege bahia"] },
  { value: "calcario", label: "Calcário", aliases: ["calcario"] },
  { value: "marmore", label: "Mármore", aliases: ["marmore"] },
  { value: "granito", label: "Granito", aliases: ["granito"] },
  { value: "quartzo", label: "Quartzo", aliases: ["quartzo"] },
  { value: "onix", label: "Ônix", aliases: ["onix"] },
  { value: "travertino", label: "Travertino", aliases: ["travertino"] },
  { value: "vidro", label: "Vidro", aliases: ["vidro"] },
  { value: "cristal", label: "Cristal", aliases: ["cristal"] },
  { value: "resina", label: "Resina", aliases: ["resina"] },
  {
    value: "metal",
    label: "Metal",
    aliases: ["metal", "metalica", "metalico", "metais"],
  },
  { value: "latao", label: "Latão", aliases: ["latao"] },
  { value: "bronze", label: "Bronze", aliases: ["bronze"] },
  { value: "aco", label: "Aço", aliases: ["aco"] },
  { value: "madeira", label: "Madeira", aliases: ["madeira"] },
];

const MATERIAL_ORDER = new Map(
  MATERIAL_RULES.map((rule, index) => [rule.value, index]),
);

export const cache = { maxAge: 120 };
export const cacheKey = ({ slug = "", limit = 12 }: Props) =>
  `${slug}:${limit}`;

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value: string): string {
  return fold(value).replace(/\s+/g, "-").slice(0, 64);
}

function containsAlias(material: string, alias: string): boolean {
  return ` ${fold(material)} `.includes(` ${fold(alias)} `);
}

function materialBuckets(rawValue: string, rawLabel: string) {
  const known = MATERIAL_RULES.filter((rule) =>
    rule.aliases.some((alias) => containsAlias(rawValue, alias))
  );
  if (known.length) return known;

  // Unknown materials remain usable instead of disappearing. They keep the
  // CMS label until a curator adds a canonical rule above.
  return [{
    value: slug(rawValue) || rawValue,
    label: rawLabel || rawValue,
    aliases: [rawValue],
  }];
}

export function normalizeMaterials(
  value: unknown,
  limit: number,
): MaterialFacet[] {
  if (!Array.isArray(value)) return [];

  const grouped = new Map<
    string,
    { label: string; count: number; sourceValues: Set<string> }
  >();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const facet = item as Record<string, unknown>;
    const rawValue = typeof facet.value === "string" ? facet.value.trim() : "";
    if (!rawValue) continue;
    const rawLabel = typeof facet.label === "string" && facet.label.trim()
      ? facet.label.trim()
      : rawValue;
    const count = typeof facet.count === "number" ? facet.count : 0;

    for (const bucket of materialBuckets(rawValue, rawLabel)) {
      const current = grouped.get(bucket.value) ?? {
        label: bucket.label,
        count: 0,
        sourceValues: new Set<string>(),
      };
      current.count += count;
      current.sourceValues.add(rawValue);
      grouped.set(bucket.value, current);
    }
  }

  return [...grouped.entries()]
    .map(([value, item]) => ({
      value,
      label: item.label,
      count: item.count,
      queryValues: [value],
      sourceValues: [...item.sourceValues],
    }))
    .sort((left, right) => {
      const leftOrder = MATERIAL_ORDER.get(left.value) ??
        Number.MAX_SAFE_INTEGER;
      const rightOrder = MATERIAL_ORDER.get(right.value) ??
        Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder ||
        right.count - left.count ||
        left.label.localeCompare(right.label, "pt-BR");
    })
    .slice(0, Math.max(1, limit));
}

/** Converts selected public material keys into Storefront V2 query values. */
export function expandMaterialFilters(
  selected: string[],
  facets: MaterialFacet[],
): string[] {
  const values = selected.flatMap((value) => {
    const facet = facets.find((item) => item.value === value);
    return facet?.queryValues.length ? facet.queryValues : [value];
  });
  return [...new Set(values)];
}

/** Maps legacy raw material query values back to the stable public facet keys. */
export function resolveMaterialFilterKeys(
  selected: string[],
  facets: MaterialFacet[],
): string[] {
  const keys = selected.flatMap((value) => {
    const direct = facets.find((item) => item.value === value);
    if (direct) return [direct.value];
    const legacy = facets.filter((item) => item.sourceValues.includes(value));
    return legacy.length ? legacy.map((item) => item.value) : [value];
  });
  return [...new Set(keys)];
}

export default async function MaterialFacets({ slug, limit = 12 }: Props = {}) {
  try {
    const params = new URLSearchParams({ page: "1", limit: "1" });
    const response = slug
      ? await fetchStorefrontCollection(slug, params)
      : await fetchStorefrontProducts(params);
    const facets = response.facets as { materials?: unknown };
    return normalizeMaterials(facets.materials, limit);
  } catch {
    return [];
  }
}
