import { Head } from "$fresh/runtime.ts";
import Image from "apps/website/components/Image.tsx";
import { Picture, Source } from "apps/website/components/Picture.tsx";

const PAYLOAD_MEDIA_PATH_PREFIX = "/api/media/file/";
const GOOGLE_DRIVE_THUMBNAIL_HOST = "drive.google.com";
const GOOGLE_DRIVE_THUMBNAIL_PATH = "/thumbnail";

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
  }: EsmeraImageProps,
) {
  if (isDirectMediaURL(src)) {
    return (
      <img
        class={className}
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        width={width}
        height={height}
        sizes={sizes}
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
    return (
      <>
        {preload && (
          <Head>
            <link
              rel="preload"
              as="image"
              href={mobileAsset}
              media="(max-width: 767px)"
              {...{ fetchPriority }}
            />
            <link
              rel="preload"
              as="image"
              href={desktopSrc}
              media="(min-width: 768px)"
              {...{ fetchPriority }}
            />
          </Head>
        )}
        <picture class={className}>
          <source
            media="(max-width: 767px)"
            srcSet={mobileAsset}
            width={mobileWidth}
            height={mobileHeight}
            sizes="100vw"
            {...{ fetchPriority }}
          />
          <source
            media="(min-width: 768px)"
            srcSet={desktopSrc}
            width={desktopWidth}
            height={desktopHeight}
            sizes="100vw"
            {...{ fetchPriority }}
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
