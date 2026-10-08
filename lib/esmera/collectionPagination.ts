/** Stable pagination labels and navigable, filter-preserving collection URLs. */
export type CollectionPageItem = number | "ellipsis";

export function collectionPageItems(
  currentPage: number,
  totalPages: number,
): CollectionPageItem[] {
  const last = Math.max(0, Math.trunc(totalPages));
  if (last === 0) return [];
  const current = Math.max(1, Math.min(Math.trunc(currentPage), last));
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);

  const candidates = current <= 3
    ? [1, 2, 3, last - 1, last]
    : current >= last - 2
    ? [1, 2, last - 2, last - 1, last]
    : [1, 2, current - 1, current, current + 1, last - 1, last];
  const pages = [...new Set(
    candidates.filter((page) => page >= 1 && page <= last),
  )].sort((a, b) => a - b);
  const result: CollectionPageItem[] = [];
  for (const page of pages) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && page - previous === 2) {
      result.push(previous + 1);
    } else if (typeof previous === "number" && page - previous > 2) {
      result.push("ellipsis");
    }
    result.push(page);
  }
  return result;
}

export function collectionPageHref(
  baseHref: string,
  currentParams: URLSearchParams,
  page: number,
): string {
  const path = baseHref.split(/[?#]/, 1)[0];
  const params = new URLSearchParams(currentParams);
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}#esv-collection-results`;
}
