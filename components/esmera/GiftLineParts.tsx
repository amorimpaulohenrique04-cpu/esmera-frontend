import BuyButton from "../../islands/BuyButton.tsx";
import ProductActions from "../../islands/ProductActions.tsx";
import {
  optimizePayloadMediaURL,
  payloadMediaSrcSet,
} from "../../lib/esmera/mediaVariant.ts";
import type { GiftPiece } from "../../lib/esmera/giftLine.ts";
import type { StorefrontMediaV2 } from "../../lib/esmera/storefront.ts";

function GiftImage(
  { media, sizes, class: className, alt }: {
    media: StorefrontMediaV2;
    sizes: string;
    class?: string;
    alt: string;
  },
) {
  return (
    <img
      class={className}
      src={optimizePayloadMediaURL(media.url, 1200)}
      srcSet={payloadMediaSrcSet(media.url, 2000) || undefined}
      data-original-src={media.fullUrl || media.url}
      sizes={sizes}
      alt={alt}
      width={media.width ?? 1600}
      height={media.height ?? 1068}
      loading="lazy"
      decoding="async"
    />
  );
}

/** Foto da peça. O clique abre o mesmo modal dos demais cards da loja. */
export function GiftShot(
  { piece, sizes }: { piece: GiftPiece; sizes: string },
) {
  return (
    <div class="gl-shot">
      {piece.image && (
        <GiftImage
          media={piece.image}
          sizes={sizes}
          alt={piece.image.alt || piece.title}
        />
      )}
      {piece.alternateImage && (
        <GiftImage
          class="gl-shot__alt"
          media={piece.alternateImage}
          sizes={sizes}
          alt=""
        />
      )}
      <ProductActions
        productId={piece.id}
        productTitle={piece.title}
        product={piece.modalProduct}
        presentation="media"
      />
    </div>
  );
}

/** Compra direta quando possível; caso contrário, consulta pelo modal. */
export function GiftBuy(
  { piece, icon = false }: { piece: GiftPiece; icon?: boolean },
) {
  return (
    <div class={`gl-buy${icon ? " gl-buy--icon" : ""}`}>
      {piece.isPurchasable
        ? (
          <BuyButton
            productId={piece.id}
            productSlug={piece.slug}
            productTitle={piece.title}
            product={piece.modalProduct}
          />
        )
        : (
          <ProductActions
            productId={piece.id}
            productTitle={piece.title}
            product={piece.modalProduct}
            compact
            emphasized
          />
        )}
    </div>
  );
}

export function GiftPrice({ piece }: { piece: GiftPiece }) {
  return <>{piece.price ?? "Sob consulta"}</>;
}
