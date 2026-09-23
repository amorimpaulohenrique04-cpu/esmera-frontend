import type { EsmeraObject } from "../lib/payload/types.ts";

export interface BuyButtonProps {
  productId: string;
  productSlug: string;
  productTitle: string;
  product: EsmeraObject;
}

/**
 * Adiciona a peça ao carrinho global. O cabeçalho escuta este mesmo evento,
 * persiste o item e abre o drawer em toda adição.
 */
export default function BuyButton(
  { productId, productSlug, productTitle, product }: BuyButtonProps,
) {
  return (
    <button
      type="button"
      class="esv-card-cta"
      aria-label={`Adicionar ${productTitle} ao carrinho`}
      onClick={(event) =>
        globalThis.dispatchEvent(
          new CustomEvent("esmera:add-to-enquiry", {
            detail: {
              productId,
              productSlug,
              product,
              trigger: event.currentTarget,
            },
          }),
        )}
    >
      <span>Adicionar ao carrinho</span>
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <path d="M3.75 9h10.5M10 4.75 14.25 9 10 13.25" />
      </svg>
    </button>
  );
}
