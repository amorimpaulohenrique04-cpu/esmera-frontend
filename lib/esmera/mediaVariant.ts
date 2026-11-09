const PAYLOAD_MEDIA_PATH_PREFIX = "/api/media/file/";

/** Larguras aceitas por `/api/media/variant` no CMS. */
const MEDIA_VARIANT_WIDTHS = [480, 800, 1200, 1600, 2000] as const;
const LARGEST_WIDTH = MEDIA_VARIANT_WIDTHS[MEDIA_VARIANT_WIDTHS.length - 1];

function variantWidth(requested: number): number {
  return MEDIA_VARIANT_WIDTHS.find((width) => width >= requested) ??
    LARGEST_WIDTH;
}

/**
 * Payload serves uploads through /api/media/file/*, including custom domains.
 * These URLs must stay away from decoims.com, which cannot fetch this upstream.
 */
export function isPayloadMediaURL(src: string): boolean {
  try {
    const url = new URL(src);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      url.pathname.startsWith(PAYLOAD_MEDIA_PATH_PREFIX);
  } catch {
    return false;
  }
}

function variantURL(src: string, width: number): string | null {
  if (!isPayloadMediaURL(src)) return null;
  const source = new URL(src);
  const filename = source.pathname.slice(PAYLOAD_MEDIA_PATH_PREFIX.length);
  if (!filename || filename.includes("/")) return null;
  return `${source.origin}/api/media/variant/${width}/${filename}`;
}

/** Versão WebP reduzida gerada pelo CMS. Fora do CMS, devolve a própria URL. */
export function optimizePayloadMediaURL(src: string, width: number): string {
  return variantURL(src, variantWidth(width)) ?? src;
}

export function payloadMediaSrcSet(src: string, maxWidth: number): string {
  const largest = variantWidth(maxWidth);
  return MEDIA_VARIANT_WIDTHS.filter((width) => width <= largest)
    .flatMap((width) => {
      const url = variantURL(src, width);
      return url ? [`${url} ${width}w`] : [];
    })
    .join(", ");
}
