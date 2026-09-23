import { getAvailabilityMeta } from "../../components/esmera/availability.ts";
import { EsmeraImage } from "../../components/esmera/ResponsiveMedia.tsx";
import {
  loadResolvedHome,
  type ResolvedHome,
} from "../../lib/esmera/homeData.ts";
import type { EsmeraObject } from "../../lib/payload/types.ts";
import ProductActions from "../../islands/ProductActions.tsx";
import ShareProductLink from "../../islands/ShareProductLink.tsx";

export interface Props {
  product?: EsmeraObject;
  eyebrow?: string;
  /** @format textarea */
  editorialText?: string;
  dimensions?: string;
  showFullDetails?: boolean;
  headingLevel?: "h1" | "h2";
  instanceKey?: string;
}

export const loader = async (props: Props) => ({
  ...props,
  resolvedHome: await loadResolvedHome(),
});

function toDomToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "object";
}

function SignatureObjectView({
  product,
  eyebrow = "05 — Peça em destaque",
  editorialText =
    "Veja os detalhes de material, acabamento e dimensões desta peça.",
  dimensions = "",
  showFullDetails = false,
  headingLevel = "h2",
  instanceKey,
}: Props) {
  if (!product) return null;
  const availability = getAvailabilityMeta(product.availability);
  const facts = [
    product.material ? { label: "Material", value: product.material } : null,
    dimensions ? { label: "Dimensões", value: dimensions } : null,
    product.edition ? { label: "Edição", value: product.edition } : null,
    { label: "Disponibilidade", value: availability.label },
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const editorialCover = product.gallery.find((item) => item.role === "cover");
  const primaryImage = editorialCover?.url || product.image;
  const primaryAlt = editorialCover?.alt || product.alt;
  const additionalGallery = product.gallery.filter((item) =>
    item.url !== primaryImage && item.url !== product.detailImage
  );
  const domToken = toDomToken(instanceKey ?? product.id);
  const sectionId = `signature-${domToken}`;
  const titleId = `${sectionId}-title`;

  return (
    <section
      id={sectionId}
      class="esv-signature"
      aria-labelledby={titleId}
    >
      <div class="esv-shell esv-signature-grid">
        <figure
          class={`esv-signature-media${
            product.detailImage ? " has-detail" : ""
          }`}
          data-motion="media-reveal"
          data-motion-order="0"
        >
          <EsmeraImage
            class="esv-signature-image-primary"
            src={primaryImage}
            alt={primaryAlt}
            loading="lazy"
            decoding="async"
            width={1400}
            height={1050}
            sizes="(max-width: 429px) calc(100vw - 36px), (max-width: 767px) calc(100vw - 44px), (max-width: 1023px) 62vw, 58vw"
          />
          {product.detailImage && (
            <EsmeraImage
              class="esv-signature-image-detail"
              src={product.detailImage}
              alt=""
              loading="lazy"
              decoding="async"
              width={1400}
              height={1050}
              sizes="(max-width: 429px) calc(100vw - 36px), (max-width: 767px) calc(100vw - 44px), (max-width: 1023px) 62vw, 58vw"
            />
          )}
        </figure>

        <div
          class="esv-signature-copy"
          data-motion="reveal"
          data-motion-order="2"
        >
          <p class="esv-kicker">{eyebrow}</p>
          {headingLevel === "h1"
            ? <h1 id={titleId}>{product.title}</h1>
            : <h2 id={titleId}>{product.title}</h2>}
          {product.subtitle && (
            <p class="esv-signature-subtitle">{product.subtitle}</p>
          )}
          <p class="esv-signature-text">{editorialText}</p>

          <dl class="esv-signature-facts">
            {facts.slice(0, 4).map((fact, index) => (
              <div data-motion="reveal" data-motion-order={String(index + 3)}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {product.price && (
            <div class="esv-signature-value">{product.price}</div>
          )}
          <ProductActions
            productId={product.id}
            productTitle={product.title}
            product={product}
            compact
          />
          {showFullDetails && <ShareProductLink productTitle={product.title} />}
        </div>
      </div>
      {showFullDetails && additionalGallery.length > 0 && (
        <div class="esv-shell esv-product-shelf" role="list">
          {additionalGallery.map((item) => (
            <figure key={`${item.key}-${item.url}`} role="listitem">
              <EsmeraImage
                src={item.url}
                alt={item.alt}
                loading="lazy"
                decoding="async"
                width={1200}
                height={1200}
                sizes="(max-width: 767px) 100vw, 50vw"
              />
            </figure>
          ))}
        </div>
      )}
      {showFullDetails && product.attributes.length > 0 && (
        <div class="esv-shell esv-section">
          <h2>Detalhes do objeto</h2>
          <dl class="esv-signature-facts">
            {product.attributes.map((attribute) => (
              <div key={`${attribute.label}-${attribute.value}`}>
                <dt>{attribute.label}</dt>
                <dd>{attribute.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

export default function SignatureObject(
  props: Props & { resolvedHome?: ResolvedHome },
) {
  if (props.resolvedHome) {
    const slides = props.resolvedHome.signature;
    if (!slides || slides.length === 0) return null;
    return (
      <>
        {slides.map((slide, index) => (
          <SignatureObjectView
            key={`${slide.product?.id ?? "signature"}-${index}`}
            instanceKey={`${slide.product?.id ?? "signature"}-${index}`}
            {...slide}
          />
        ))}
      </>
    );
  }
  return <SignatureObjectView {...props} />;
}
