import Arrow from "../components/esmera/Arrow.tsx";
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

type ProductDetailResponse = { product?: ModalProductMedia };

const modalMediaCache = new Map<string, Promise<ModalProductMedia | null>>();

async function requestModalMedia(
  slug: string,
): Promise<ModalProductMedia | null> {
  try {
    const response = await fetch(
      `/api/esmera-product-detail?slug=${encodeURIComponent(slug)}`,
      { headers: { accept: "application/json" } },
    );
    if (!response.ok) throw new Error("product detail failed");
    const data = await response.json() as ProductDetailResponse;
    const media = data.product ?? null;
    if (!media) modalMediaCache.delete(slug);
    return media;
  } catch {
    modalMediaCache.delete(slug);
    return null;
  }
}

function loadModalMedia(
  product?: EsmeraObject,
): Promise<ModalProductMedia | null> {
  if (!product?.slug || product.gallery.length > 0) {
    return Promise.resolve(null);
  }

  const cached = modalMediaCache.get(product.slug);
  if (cached) return cached;

  const pending = requestModalMedia(product.slug);
  modalMediaCache.set(product.slug, pending);
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
    if (product?.detailImage && typeof globalThis.Image === "function") {
      const image = new globalThis.Image();
      image.decoding = "async";
      image.src = product.detailImage;
    }

    // Cards Storefront V2 carregam só o crop 3:4. Antecipamos o detalhe para que
    // o clique abra o modal já com `sizes.gallery`, que preserva a proporção.
    void loadModalMedia(product);
  };

  const dispatch = async (name: string, trigger: HTMLElement) => {
    const sourceImage = findSourceImage(trigger);
    const cachedSource = sourceImage?.currentSrc || sourceImage?.src;

    let eventProduct = name === "esmera:open-product" && product && cachedSource
      ? { ...product, image: cachedSource }
      : product;

    if (name === "esmera:open-product" && eventProduct) {
      const media = await loadModalMedia(eventProduct);
      if (media?.gallery.length) {
        const detailImage = media.gallery.find((item) => item.role === "detail")
          ?.url;
        eventProduct = {
          ...eventProduct,
          image: media.image,
          gallery: media.gallery,
          detailImage: detailImage ?? eventProduct.detailImage,
        };
      }
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
    onFocus: warmDetailImage,
  };

  if (presentation === "media") {
    return (
      <button
        class="esv-product-modal-trigger esv-product-modal-trigger-media"
        type="button"
        aria-label={`Conhecer a peça ${productTitle}`}
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
        aria-label={`Conhecer a peça ${productTitle}`}
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
          aria-label={`Conhecer a peça ${productTitle}`}
          {...commonWarmup}
          onClick={(event) =>
            void dispatch("esmera:open-product", event.currentTarget)}
        >
          Conhecer a peça <Arrow size={14} />
        </button>
      </div>
    );
  }

  return (
    <div class="esv-product-actions">
      <button
        type="button"
        aria-label={`Conhecer a peça ${productTitle}`}
        {...commonWarmup}
        onClick={(event) =>
          void dispatch("esmera:open-product", event.currentTarget)}
      >
        Conhecer a peça <Arrow size={13} />
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
