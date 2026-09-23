import StorefrontPageData from "../../loaders/Esmera/StorefrontPageData.ts";

/**
 * Shared page shell sourced from the same cached bootstrap used by Home.
 * This avoids three independent CMS reads (navigation/settings/categories)
 * on catalog, PDP and institutional routes.
 */
export async function getPageChrome() {
  const data = await StorefrontPageData();
  return {
    navigation: data.navigation,
    settings: data.siteSettings,
    categories: data.categories,
    unavailable: data.unavailable,
  };
}
