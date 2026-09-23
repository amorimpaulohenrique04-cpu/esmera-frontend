import type {
  StorefrontMediaV2,
  StorefrontProductDetailV2,
} from "./storefront.ts";
import type { EsmeraObject } from "../payload/types.ts";

export type ModalProductMedia = {
  id: string;
  slug: string;
  image: string;
  gallery: EsmeraObject["gallery"];
};

function roleForIndex(index: number): EsmeraObject["gallery"][number]["role"] {
  if (index === 0) return "cover";
  if (index === 1) return "detail";
  return "context";
}

function galleryItem(
  media: StorefrontMediaV2,
  index: number,
): EsmeraObject["gallery"][number] | null {
  const url = media.url?.trim();
  if (!url) return null;

  return {
    url,
    fullUrl: url,
    alt: media.alt?.trim() || "",
    width: media.width ?? undefined,
    height: media.height ?? undefined,
    fullWidth: media.width ?? undefined,
    fullHeight: media.height ?? undefined,
    key: `storefront-${media.id || index}-${index}`,
    role: roleForIndex(index),
  };
}

/**
 * Adapta exclusivamente a mídia do Storefront Product Detail V2 para o modal.
 * A listagem usa crops editoriais 3:4; o detalhe usa `sizes.gallery`, que preserva
 * a proporção original. Nunca devemos promover a imagem de card a galeria final.
 */
export function storefrontDetailToModalMedia(
  detail: StorefrontProductDetailV2,
): ModalProductMedia | null {
  const product = detail?.product;
  if (!product?.id || !product.slug) return null;

  const seen = new Set<string>();
  const gallery = (product.gallery ?? []).flatMap((media, index) => {
    const item = galleryItem(media, index);
    if (!item || seen.has(item.url)) return [];
    seen.add(item.url);
    return [item];
  });

  // O endpoint V2 deve trazer gallery. Mantemos fallback apenas para resiliência;
  // ele não substitui gallery quando a versão sem crop existe.
  if (gallery.length === 0 && product.image?.url) {
    const fallback = galleryItem(product.image, 0);
    if (fallback) gallery.push(fallback);
  }

  const image = gallery[0]?.url || product.image?.url?.trim() || "";
  if (!image) return null;

  return {
    id: product.id,
    slug: product.slug,
    image,
    gallery,
  };
}
