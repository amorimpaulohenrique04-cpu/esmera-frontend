import { ImageWidget } from "apps/admin/widgets.ts";
import Arrow from "../../../components/esmera/Arrow.tsx";
import { EsmeraPicture } from "../../../components/esmera/ResponsiveMedia.tsx";

export interface Props {
  /** @description Rótulo curto acima do título, ex.: "A ESMÉRA" */
  eyebrow?: string;
  /** @description Título principal da página */
  title?: string;
  /** @description Texto de apresentação institucional */
  text?: string;
  /** @description Rótulo do link de chamada, ex.: "NOSSA ESSÊNCIA" */
  ctaLabel?: string;
  /** @description Destino do link de chamada */
  ctaHref?: string;
  /** @description Imagem editorial do hero (desktop) */
  image?: ImageWidget;
  /** @description Imagem editorial do hero (mobile, opcional) */
  imageMobile?: ImageWidget;
  /** @description Texto alternativo da imagem */
  imageAlt?: string;
}

export default function AboutHero({
  eyebrow = "A ESMÉRA",
  title = "A ESMÉRA",
  text = "",
  ctaLabel = "",
  ctaHref = "",
  image,
  imageMobile,
  imageAlt = "",
}: Props) {
  return (
    <section class="esv-about-hero" aria-labelledby="esv-about-hero-title">
      <div class="esv-shell esv-about-hero-grid">
        <div class="esv-about-hero-copy">
          <nav class="esv-about-breadcrumb" aria-label="Trilha de navegação">
            <a href="/">Início</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          {eyebrow && (
            <p class="esv-kicker" data-motion="reveal" data-motion-order="0">
              {eyebrow}
            </p>
          )}
          <h1
            id="esv-about-hero-title"
            data-motion="reveal"
            data-motion-order="1"
          >
            {title}
          </h1>
          {text && (
            <p
              class="esv-about-hero-text"
              data-motion="reveal"
              data-motion-order="2"
            >
              {text}
            </p>
          )}
          {ctaLabel && ctaHref && (
            <a
              class="esv-text-link"
              href={ctaHref}
              data-motion="reveal"
              data-motion-order="3"
            >
              {ctaLabel} <Arrow size={13} />
            </a>
          )}
        </div>
        {image && (
          <figure class="esv-about-hero-media" data-motion="media-reveal">
            <EsmeraPicture
              desktopSrc={image}
              mobileSrc={imageMobile ?? image}
              alt={imageAlt}
              desktopWidth={1200}
              desktopHeight={1400}
              mobileWidth={800}
              mobileHeight={1000}
              loading="eager"
              decoding="async"
              preload
              fetchPriority="high"
            />
          </figure>
        )}
      </div>
    </section>
  );
}
