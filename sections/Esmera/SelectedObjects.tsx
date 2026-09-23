import Arrow from "../../components/esmera/Arrow.tsx";
import ObjectCard from "../../components/esmera/ObjectCard.tsx";
import {
  loadResolvedHome,
  type ResolvedHome,
} from "../../lib/esmera/homeData.ts";
import {
  fetchStorefrontProduct,
  type StorefrontProductV2,
} from "../../lib/esmera/storefront.ts";
import type { EsmeraObject } from "../../lib/payload/types.ts";

export interface Props {
  eyebrow?: string;
  title?: string;
  /** @format textarea */
  text?: string;
  /** @maxItems 4 */
  products?: EsmeraObject[];
  collectionLabel?: string;
  collectionHref?: string;
}

type CuratedProduct = StorefrontProductV2 | EsmeraObject;

function hasRenderableImage(product: CuratedProduct): boolean {
  return typeof product.image === "string"
    ? product.image.trim().length > 0
    : Boolean(product.image?.url);
}

export const loader = async (props: Props) => {
  const resolvedHome = await loadResolvedHome();
  const source = resolvedHome.selectedObjects ?? props;
  const selectedProducts = (source.products ?? []).slice(0, 4);
  const storefrontProducts = await Promise.all(
    selectedProducts.map(async (product): Promise<CuratedProduct> => {
      try {
        return (await fetchStorefrontProduct(product.slug)).product;
      } catch (error) {
        console.warn(JSON.stringify({
          event: "selected_object_enrichment_failed",
          slug: product.slug,
          fallbackUsed: true,
          errorType: error instanceof Error ? error.name : "unknown",
        }));
        return product;
      }
    }),
  );

  return {
    ...props,
    resolvedHome,
    storefrontProducts,
  };
};

export default function SelectedObjects(
  props: Props & {
    resolvedHome?: ResolvedHome;
    storefrontProducts?: CuratedProduct[];
  },
) {
  if (props.resolvedHome?.selectedObjects === null) return null;
  const source = props.resolvedHome?.selectedObjects ?? props;
  const {
    eyebrow = "03 — Seleção",
    title = "Objetos de\npresença singular.",
    text =
      "Uma seleção de peças disponíveis em pedra natural, escolhidas pelo design, acabamento e presença no ambiente.",
    collectionLabel = "Ver coleção",
    collectionHref = "/colecao",
  } = source;
  const curatedProducts = (props.storefrontProducts ?? source.products ?? [])
    .filter((product) =>
      Boolean(
        product.id && product.slug && product.title &&
          hasRenderableImage(product),
      )
    )
    .slice(0, 4);

  return (
    <section
      id="selection"
      class="esv-selected"
      aria-labelledby="esv-selected-title"
      style={{ paddingTop: "clamp(56px, 6vw, 118px)" }}
    >
      <div class="esv-shell esv-selected-head">
        <span class="esv-kicker" data-motion="reveal" data-motion-order="0">
          {eyebrow}
        </span>
        <h2 id="esv-selected-title" data-motion="reveal" data-motion-order="1">
          {title}
        </h2>
        {text && <p data-motion="reveal" data-motion-order="2">{text}</p>}
      </div>

      {curatedProducts.length > 0
        ? (
          <div id="objects" class="esv-shell esv-product-shelf" role="list">
            {curatedProducts.map((item, index) => (
              <ObjectCard key={item.id} item={item} motionOrder={index} />
            ))}
          </div>
        )
        : (
          <div class="esv-shell esv-section" role="status">
            <p>Objetos temporariamente indisponíveis.</p>
          </div>
        )}

      {collectionLabel && collectionHref && (
        <div
          class="esv-shell esv-selected-collection-link"
          style={{ display: "flex", justifyContent: "flex-end" }}
          data-motion="reveal"
          data-motion-order="1"
        >
          <a class="esv-text-link" href={collectionHref}>
            {collectionLabel} <Arrow size={14} />
          </a>
        </div>
      )}
    </section>
  );
}
