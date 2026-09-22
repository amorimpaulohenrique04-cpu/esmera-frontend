import ProductActions from "../../islands/ProductActions.tsx";
import WishlistButton from "../../islands/WishlistButton.tsx";
import BuyButton from "../../islands/BuyButton.tsx";
import type { EsmeraObject } from "../../lib/payload/types.ts";
import type { StorefrontProductV2 } from "../../lib/esmera/storefront.ts";
import {
  esmeraObjectToCardViewModel,
  formatPriceCents,
  toProductCardViewModel,
} from "../../lib/esmera/productCard.ts";
import { EsmeraImage } from "./ResponsiveMedia.tsx";

export interface Props {
  item: StorefrontProductV2 | EsmeraObject;
  motionOrder?: number;
}

function isEsmeraObject(
  item: StorefrontProductV2 | EsmeraObject,
): item is EsmeraObject {
  return typeof item.image === "string";
}

export default function ObjectCard({ item, motionOrder = 0 }: Props) {
  const legacyItem = isEsmeraObject(item);
  const vm = legacyItem
    ? esmeraObjectToCardViewModel(item)
    : toProductCardViewModel(item);
  const containClass = vm.mediaFit === "contain"
    ? " box-border !object-contain !object-center !p-3 sm:!p-4 !transform-none"
    : "";

  // Compatibilidade temporária apenas com o modal legado; a apresentação do
  // card usa o contrato Storefront quando disponível e preserva o objeto já
  // resolvido pela Home como fallback se o enriquecimento público falhar.
  const modalProduct: EsmeraObject = legacyItem ? item : {
    id: item.id,
    slug: item.slug,
    code: item.code ?? "",
    title: item.identity?.name ?? item.title,
    image: item.image?.url ?? "",
    alt: item.image?.alt ?? item.title,
    availability: item.availability === "unique"
      ? "unique"
      : item.state ?? "available",
    category: item.pieceType ?? undefined,
    material: item.material ?? undefined,
    subtitle: item.subtitle ?? undefined,
    detailImage: item.hoverImage?.url ?? undefined,
    gallery: [],
    attributes: [],
    priceMode: item.pricing?.mode ?? "inquiry",
    priceCents: item.pricing?.priceCents ?? item.price ?? null,
    formattedPrice: formatPriceCents(
      item.pricing?.priceCents ?? item.price ?? null,
    ) ?? "",
    isInquiry: item.pricing?.mode !== "fixed",
    variants: [],
    seo: { title: "", description: "", noindex: false },
  };

  return (
    <div
      class={`esv-product-card${vm.hoverImage ? " has-detail" : ""}${
        vm.mediaFit === "contain" ? " is-media-contain" : ""
      }`}
      role="listitem"
      data-product-id={vm.id}
      data-motion="reveal"
      data-motion-order={String(motionOrder)}
    >
      <ProductActions
        productId={vm.id}
        productTitle={vm.title}
        product={modalProduct}
        presentation="media"
      />

      <div class="esv-product-media-wrap">
        <figure class="esv-product-media">
          <EsmeraImage
            class={`${
              vm.hoverImage
                ? "esv-product-image-primary"
                : "esv-product-image-static"
            }${containClass}`}
            src={vm.image ?? ""}
            alt={vm.imageAlt}
            loading="lazy"
            decoding="async"
            width={900}
            height={1125}
            sizes="(max-width: 639px) calc(100vw - 44px), (max-width: 1023px) 46vw, 31vw"
          />
          {vm.hoverImage && (
            <EsmeraImage
              class={`esv-product-image-detail${containClass}`}
              src={vm.hoverImage}
              alt={vm.hoverImageAlt}
              loading="lazy"
              decoding="async"
              width={900}
              height={1125}
              sizes="(max-width: 639px) calc(100vw - 44px), (max-width: 1023px) 46vw, 31vw"
            />
          )}
        </figure>

        {vm.status.includes("SOB ENCOMENDA") && (
          <span class="esv-card-status">Sob encomenda</span>
        )}

        <WishlistButton productId={vm.id} productTitle={vm.title} />
      </div>

      <div class="esv-product-card-copy">
        <span
          class="esv-card-eyebrow block mb-1.5 truncate text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400"
          title={vm.eyebrow || undefined}
        >
          {vm.eyebrow || <span aria-hidden="true">&nbsp;</span>}
        </span>

        <h3 class="esv-card-title">{vm.title}</h3>

        <div class="esv-card-value-row">
          {vm.price && <span class="esv-card-price">{vm.price}</span>}
        </div>

        <div class="esv-card-action-slot">
          {vm.isPurchasable
            ? (
              <BuyButton
                productId={vm.id}
                productSlug={vm.slug}
                productTitle={vm.title}
                product={modalProduct}
              />
            )
            : (
              <ProductActions
                productId={vm.id}
                productTitle={vm.title}
                product={modalProduct}
                compact
                emphasized
              />
            )}
        </div>
      </div>
    </div>
  );
}