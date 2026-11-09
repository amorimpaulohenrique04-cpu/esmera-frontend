import { Head } from "$fresh/runtime.ts";
import Image from "apps/website/components/Image.tsx";
import { Picture, Source } from "apps/website/components/Picture.tsx";
import {
  isPayloadMediaURL,
  optimizePayloadMediaURL,
  payloadMediaSrcSet,
} from "../../lib/esmera/mediaVariant.ts";

export { isPayloadMediaURL, optimizePayloadMediaURL, payloadMediaSrcSet };

const GOOGLE_DRIVE_THUMBNAIL_HOST = "drive.google.com";
const GOOGLE_DRIVE_THUMBNAIL_PATH = "/thumbnail";
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
    const directSrc = payloadMedia ? optimizePayloadMediaURL(src, width) : src;
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
      ? payloadMediaSrcSet(desktopSrc, desktopWidth) || desktopSrc
      : optimizedDesktop;
    const mobileSrcSet = mobilePayload
      ? payloadMediaSrcSet(mobileAsset, mobileWidth) || mobileAsset
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
