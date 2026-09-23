import { Head } from "$fresh/runtime.ts";
import Image from "apps/website/components/Image.tsx";
import { Picture, Source } from "apps/website/components/Picture.tsx";

const PAYLOAD_MEDIA_PATH_PREFIX = "/api/media/file/";
const GOOGLE_DRIVE_THUMBNAIL_HOST = "drive.google.com";
const GOOGLE_DRIVE_THUMBNAIL_PATH = "/thumbnail";
const NEXT_IMAGE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;

function nextImageWidth(requested: number): number {
  return NEXT_IMAGE_WIDTHS.find((width) => width >= requested) ??
    NEXT_IMAGE_WIDTHS[NEXT_IMAGE_WIDTHS.length - 1];
}

function responsiveImageWidths(maxWidth: number): number[] {
  const normalizedMax = nextImageWidth(maxWidth);
  const candidates = NEXT_IMAGE_WIDTHS.filter((width) => width <= normalizedMax);
  return candidates.length > 0 ? [...candidates] : [normalizedMax];
}

export function payloadMediaSrcSet(src: string, maxWidth: number): string {
  if (!isPayloadMediaURL(src)) return "";
  return responsiveImageWidths(maxWidth)
    .map((width) => `${optimizePayloadMediaURL(src, width)} ${width}w`)
    .join(", ");
}

export function optimizePayloadMediaURL(src: string, width: number): string {
  if (!isPayloadMediaURL(src)) return src;
  try {
    const source = new URL(src);
    const optimized = new URL("/_next/image", source.origin);
    optimized.searchParams.set("url", `${source.pathname}${source.search}`);
    optimized.searchParams.set("w", String(nextImageWidth(width)));
    optimized.searchParams.set("q", "75");
    return optimized.toString();
  } catch {
    return src;
  }
}

/**
 * Payload serves uploads through /api/media/file/*, including custom domains.
 * These URLs must stay direct because decoims.com cannot fetch this upstream
 * and otherwise replaces the working source with a broken optimized srcset.
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

/**
 * As imagens institucionais da página A Esméra usam o endpoint público de
 * thumbnail do Google Drive já dimensionado. Mantê-las diretas evita que o
 * otimizador gere um segundo proxy sobre a URL do Drive.
 */
function isGoogleDriveThumbnailURL(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" &&
      url.hostname === GOOGLE_DRIVE_THUMBNAIL_HOST &&
      url.pathname === GOOGLE_DRIVE_THUMBNAIL_PATH;
  } catch {
    return false;
  }
}

function isDirectMediaURL(src: string): boolean {
  return isPayloadMediaURL(src) || isGoogleDriveThumbnailURL(src);
}

export interface EsmeraImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  class?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
}

export function EsmeraImage(
  {
    src,
    alt,
    width,
    height,
    sizes,
    class: className,
    loading = "lazy",
    decoding = "async",
    fetchPriority = "auto",
  }: EsmeraImageProps,
) {
  if (isDirectMediaURL(src)) {
    const payloadMedia = isPayloadMediaURL(src);
    const directSrc = payloadMedia
      ? optimizePayloadMediaURL(src, width)
      : src;
    const srcSet = payloadMedia ? payloadMediaSrcSet(src, width) : undefined;
    return (
      <img
        class={className}
        src={directSrc}
        srcSet={srcSet}
        alt={alt}
        loading={loading}
        decoding={decoding}
        width={width}
        height={height}
        sizes={sizes}
        {...{ fetchPriority }}
      />
    );
  }

  return (
    <Image
      class={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      width={width}
      height={height}
      sizes={sizes}
      fetchPriority={fetchPriority}
    />
  );
}

export interface EsmeraPictureProps {
  class?: string;
  desktopSrc: string;
  mobileSrc?: string;
  alt: string;
  desktopWidth: number;
  desktopHeight: number;
  mobileWidth: number;
  mobileHeight: number;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  preload?: boolean;
  fetchPriority?: "high" | "low" | "auto";
}

export function EsmeraPicture({
  class: className,
  desktopSrc,
  mobileSrc,
  alt,
  desktopWidth,
  desktopHeight,
  mobileWidth,
  mobileHeight,
  loading = "lazy",
  decoding = "async",
  preload = false,
  fetchPriority = "auto",
}: EsmeraPictureProps) {
  const mobileAsset = mobileSrc ?? desktopSrc;
  const usesDirectMedia = isDirectMediaURL(desktopSrc) ||
    isDirectMediaURL(mobileAsset);

  if (usesDirectMedia) {
    const desktopPayload = isPayloadMediaURL(desktopSrc);
    const mobilePayload = isPayloadMediaURL(mobileAsset);
    const optimizedDesktop = desktopPayload
      ? optimizePayloadMediaURL(desktopSrc, desktopWidth)
      : desktopSrc;
    const optimizedMobile = mobilePayload
      ? optimizePayloadMediaURL(mobileAsset, mobileWidth)
      : mobileAsset;
    const desktopSrcSet = desktopPayload
      ? payloadMediaSrcSet(desktopSrc, desktopWidth)
      : optimizedDesktop;
    const mobileSrcSet = mobilePayload
      ? payloadMediaSrcSet(mobileAsset, mobileWidth)
      : optimizedMobile;
    return (
      <>
        {preload && (
          <Head>
            <link
              rel="preload"
              as="image"
              href={optimizedMobile}
              media="(max-width: 767px)"
            />
            <link
              rel="preload"
              as="image"
              href={optimizedDesktop}
              media="(min-width: 768px)"
            />
          </Head>
        )}
        <picture class={className}>
          <source
            media="(max-width: 767px)"
            srcSet={mobileSrcSet}
            width={mobileWidth}
            height={mobileHeight}
            sizes="100vw"
            {...{ fetchPriority }}
          />
          <source
            media="(min-width: 768px)"
            srcSet={desktopSrcSet}
            width={desktopWidth}
            height={desktopHeight}
            sizes="100vw"
            {...{ fetchPriority }}
          />
          <img
            {...{ fetchPriority }}
            src={optimizedDesktop}
            alt={alt}
            loading={loading}
            decoding={decoding}
            width={desktopWidth}
            height={desktopHeight}
          />
        </picture>
      </>
    );
  }

  return (
    <Picture class={className} preload={preload}>
      <Source
        media="(max-width: 767px)"
        fetchPriority={fetchPriority}
        src={mobileAsset}
        width={mobileWidth}
        height={mobileHeight}
        sizes="100vw"
      />
      <Source
        media="(min-width: 768px)"
        fetchPriority={fetchPriority}
        src={desktopSrc}
        width={desktopWidth}
        height={desktopHeight}
        sizes="100vw"
      />
      <img
        {...{ fetchPriority }}
        src={desktopSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        width={desktopWidth}
        height={desktopHeight}
      />
    </Picture>
  );
}
