import { isFramePersonalizationProduct } from "../lib/esmera/framePersonalization.ts";
import type { EsmeraObject } from "../lib/payload/types.ts";

export interface BuyButtonProps {
  productId: string;
  productSlug: string;
  productTitle: string;
  product: EsmeraObject;
}

/**
 * Produtos padrão entram direto no carrinho. Quadrinhos personalizáveis passam
 * pelo modal para que tamanho, acabamento e texto sejam definidos primeiro.
 */
export default function BuyButton(
  { productId, productSlug, productTitle, product }: BuyButtonProps,
) {
  const needsPersonalization = isFramePersonalizationProduct(product);
  const actionLabel = needsPersonalization
    ? "Personalizar"
    : "Adicionar ao carrinho";

  const handleClick = async (trigger: HTMLButtonElement) => {
    if (needsPersonalization) {
      let resolvedProduct = product;
      try {
        const params = new URLSearchParams({
          slug: productSlug,
          full: "1",
        });
        const response = await fetch(
          `/api/esmera-product-detail?${params.toString()}`,
          { headers: { accept: "application/json" } },
        );
        if (response.ok) {
          const data = await response.json() as {
            fullProduct?: EsmeraObject | null;
          };
          if (data.fullProduct) resolvedProduct = data.fullProduct;
        }
      } catch {
        // O modal ainda abre com o fallback do card e exibe validação de tamanho.
      }
      globalThis.dispatchEvent(
        new CustomEvent("esmera:open-product", {
          detail: {
            productId,
            productSlug,
            product: resolvedProduct,
            trigger,
          },
        }),
      );
      return;
    }

    const detail = { productId, productSlug, product, trigger };
    globalThis.dispatchEvent(
      new CustomEvent("esmera:add-to-enquiry", { detail }),
    );
  };

  return (
    <button
      type="button"
      class="esv-card-cta"
      aria-label={needsPersonalization
        ? `Personalizar ${productTitle}`
        : `Adicionar ${productTitle} ao carrinho`}
      onClick={(event) => void handleClick(event.currentTarget)}
    >
      <span>{actionLabel}</span>
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <path d="M3.75 9h10.5M10 4.75 14.25 9 10 13.25" />
      </svg>
    </button>
  );
}
