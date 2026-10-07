import { isFramePersonalizationProduct } from "../lib/esmera/framePersonalization.ts";
import type { EsmeraObject } from "../lib/payload/types.ts";

export interface BuyButtonProps {
  productId: string;
  productSlug: string;
  productTitle: string;
  product: EsmeraObject;
}

/**
 * Produtos padrão entram direto no carrinho. Quadrinhos personalizáveis sempre
 * passam pelo modal para que acabamento e frase sejam definidos antes da adição.
 */
export default function BuyButton(
  { productId, productSlug, productTitle, product }: BuyButtonProps,
) {
  const needsPersonalization = isFramePersonalizationProduct(product);
  const actionLabel = needsPersonalization ? "Personalizar" : "Adicionar ao carrinho";

  return (
    <button
      type="button"
      class="esv-card-cta"
      aria-label={needsPersonalization
        ? `Personalizar ${productTitle}`
        : `Adicionar ${productTitle} ao carrinho`}
      onClick={(event) =>
        globalThis.dispatchEvent(
          new CustomEvent(
            needsPersonalization ? "esmera:open-product" : "esmera:add-to-enquiry",
            {
              detail: {
                productId,
                productSlug,
                product,
                trigger: event.currentTarget,
              },
            },
          ),
        )}
    >
      <span>{actionLabel}</span>
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <path d="M3.75 9h10.5M10 4.75 14.25 9 10 13.25" />
      </svg>
    </button>
  );
}
