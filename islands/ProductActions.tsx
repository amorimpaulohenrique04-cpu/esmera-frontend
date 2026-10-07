import Arrow from "../components/esmera/Arrow.tsx";
import { isFramePersonalizationProduct } from "../lib/esmera/framePersonalization.ts";
import { ensureProductModalStyles } from "../lib/esmera/productModalStyles.ts";
import type { ModalProductMedia } from "../lib/esmera/productDetail.ts";
import type { EsmeraObject } from "../lib/payload/types.ts";

export interface Props {
  productId: string;
  productTitle: string;
  product?: EsmeraObject;
  compact?: boolean;
  emphasized?: boolean;
  presentation?: "actions" | "media" | "title";
}

type ProductDetailResponse = {
  product?: ModalProductMedia;
  fullProduct?: EsmeraObject | null;
};

const modalProductCache = new Map<string, Promise<EsmeraObject | null>>();

async function requestModalProduct(
  slug: string,
  fallback: EsmeraObject,
): Promise<EsmeraObject | null> {
  try {
    const leanEndpoint =
      `/api/esmera-product-detail?slug=${encodeURIComponent(slug)}`;
    const params = new URLSearchParams({ slug });
    if (isFramePersonalizationProduct(fallback)) params.set("full", "1");
    const endpoint = isFramePersonalizationProduct(fallback)
      ? `/api/esmera-product-detail?${params.toString()}`
      : leanEndpoint;

    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("product detail failed");
    const data = await response.json() as ProductDetailResponse;
    const media = data.product ?? null;
    const fullProduct = data.fullProduct ?? null;

    if (fullProduct) {
      return media?.gallery.length
        ? {
          ...fullProduct,
          image: media.image,
          gallery: media.gallery,
          detailImage: media.gallery.find((item) => item.role === "detail")
            ?.url ?? fullProduct.detailImage,
        }
        : fullProduct;
    }

    if (media?.gallery.length) {
      return {
        ...fallback,
        image: media.image,
        gallery: media.gallery,
        detailImage: media.gallery.find((item) => item.role === "detail")
          ?.url ?? fallback.detailImage,
      };
    }

    modalProductCache.delete(slug);
    return null;
  } catch {
    modalProductCache.delete(slug);
    return null;
  }
}

function loadModalProduct(
  product?: EsmeraObject,
): Promise<EsmeraObject | null> {
  if (!product?.slug || product.gallery.length > 0) {
    return Promise.resolve(product ?? null);
  }

  const cached = modalProductCache.get(product.slug);
  if (cached) return cached;

  const pending = requestModalProduct(product.slug, product);
  modalProductCache.set(product.slug, pending);
  return pending;
}

export default function ProductActions(
  {
    productId,
    productTitle,
    product,
    compact = false,
    emphasized = false,
    presentation = "actions",
  }: Props,
) {
  const findSourceImage = (trigger: HTMLElement) => {
    const scope = trigger.closest(".esv-product-card, .esv-signature");
    return scope?.querySelector<HTMLImageElement>(
      ".esv-product-image-primary, .esv-product-image-static, .esv-signature-image-primary",
    ) ?? null;
  };

  const warmDetailImage = () => {
    void ensureProductModalStyles();
    if (product?.detailImage && typeof globalThis.Image === "function") {
      const image = new globalThis.Image();
      image.decoding = "async";
      image.src = product.detailImage;
    }

    // Cards Storefront V2 carregam só o crop 3:4. Antecipamos o detalhe para que
    // o clique abra o modal já com `sizes.gallery`, que preserva a proporção.
    void loadModalProduct(product);
  };

  const dispatch = async (name: string, trigger: HTMLElement) => {
    const sourceImage = findSourceImage(trigger);
    const cachedSource = sourceImage?.currentSrc || sourceImage?.src;

    let eventProduct = name === "esmera:open-product" && product && cachedSource
      ? { ...product, image: cachedSource }
      : product;

    if (name === "esmera:open-product" && eventProduct) {
      const resolved = await loadModalProduct(eventProduct);
      if (resolved) eventProduct = resolved;
    }

    globalThis.dispatchEvent(
      new CustomEvent(name, {
        detail: {
          productId,
          product: eventProduct,
          trigger,
        },
      }),
    );
  };

  const commonWarmup = {
    onPointerEnter: warmDetailImage,
    onPointerDown: warmDetailImage,
    onFocus: warmDetailImage,
  };

  if (presentation === "media") {
    return (
      <button
        class="esv-product-modal-trigger esv-product-modal-trigger-media"
        type="button"
        aria-label={`Ver detalhes de ${productTitle}`}
        {...commonWarmup}
        onClick={(event) =>
          void dispatch("esmera:open-product", event.currentTarget)}
      />
    );
  }

  if (presentation === "title") {
    return (
      <button
        class="esv-product-modal-trigger esv-product-modal-trigger-title"
        type="button"
        aria-label={`Ver detalhes de ${productTitle}`}
        {...commonWarmup}
        onClick={(event) =>
          void dispatch("esmera:open-product", event.currentTarget)}
      >
        {productTitle}
      </button>
    );
  }

  if (compact) {
    return (
      <div
        class={`esv-product-actions is-compact${
          emphasized ? " is-emphasized" : ""
        }`}
      >
        <button
          type="button"
          aria-label={`Ver detalhes de ${productTitle}`}
          {...commonWarmup}
          onClick={(event) =>
            void dispatch("esmera:open-product", event.currentTarget)}
        >
          Ver detalhes <Arrow size={14} />
        </button>
      </div>
    );
  }

  return (
    <div class="esv-product-actions">
      <button
        type="button"
        aria-label={`Ver detalhes de ${productTitle}`}
        {...commonWarmup}
        onClick={(event) =>
          void dispatch("esmera:open-product", event.currentTarget)}
      >
        Ver detalhes <Arrow size={13} />
      </button>
      <button
        type="button"
        aria-label={`Adicionar ${productTitle} ao carrinho`}
        onClick={(event) =>
          void dispatch("esmera:add-to-enquiry", event.currentTarget)}
      >
        Adicionar ao carrinho
      </button>
    </div>
  );
}
