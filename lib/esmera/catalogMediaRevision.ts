/**
 * Bust legacy catalog HTTP caches after the uncropped/landscape card rollout.
 * Used by both SSR-to-CMS reads and the client-side "Carregar mais" endpoint.
 */
export const CATALOG_MEDIA_REVISION = "landscape-v3-20261008";
