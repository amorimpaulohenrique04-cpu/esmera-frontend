import StorefrontPageData from "../../loaders/Esmera/StorefrontPageData.ts";
import type { StorefrontDataSource } from "../payload/contract/diagnostics.ts";
import { type ResolvedHome, resolveHome } from "./resolveHome.ts";

function sourceFor(
  present: boolean,
  unavailable: boolean,
  stale: boolean,
): StorefrontDataSource {
  if (present) return stale ? "stale_payload" : "payload_override";
  return unavailable ? "unavailable" : "deco_baseline";
}

/**
 * Section loaders share StorefrontPageData's TTL, stale snapshot and in-flight
 * request. They must not rebuild Home with the legacy 4-request Payload path.
 */
export async function loadResolvedHome(): Promise<ResolvedHome> {
  const data = await StorefrontPageData();
  const shellUnavailable = data.unavailable.includes("shell");
  const homeUnavailable = data.unavailable.includes("home");

  return resolveHome({
    home: data.home,
    navigation: data.navigation,
    siteSettings: data.siteSettings,
    categories: data.categories,
    sources: {
      home: sourceFor(Boolean(data.home), homeUnavailable, data.stale),
      navigation: sourceFor(Boolean(data.navigation), shellUnavailable, data.stale),
      siteSettings: sourceFor(Boolean(data.siteSettings), shellUnavailable, data.stale),
      categories: sourceFor(data.categories.length > 0, shellUnavailable, data.stale),
    },
    stale: data.stale,
  });
}

/**
 * Kept for compatibility with tests/tools. StorefrontPageData owns the shared
 * bootstrap cache now, so there is no second Home cache to clear.
 */
export function clearResolvedHomeCache() {}

export type { ResolvedHome } from "./resolveHome.ts";
