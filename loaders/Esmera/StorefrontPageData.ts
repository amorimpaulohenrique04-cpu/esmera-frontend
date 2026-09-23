import { getHome } from "../../lib/payload/loaders.ts";
import { getPageChrome } from "../../lib/payload/pageData.ts";

export const cache = { maxAge: 300 };
export const cacheKey = () => "storefront-page-data";

export default async function StorefrontPageData() {
  const [home, chrome] = await Promise.allSettled([
    getHome(),
    getPageChrome(),
  ]);
  const resolvedChrome = chrome.status === "fulfilled" ? chrome.value : {
    navigation: null,
    settings: null,
    categories: [],
    unavailable: ["shell"],
  };

  return {
    home: home.status === "fulfilled" ? home.value : null,
    navigation: resolvedChrome.navigation,
    siteSettings: resolvedChrome.settings,
    categories: resolvedChrome.categories,
    unavailable: [
      home.status === "rejected" ? "home" : null,
      ...resolvedChrome.unavailable,
    ].filter((value): value is string => Boolean(value)),
  };
}
