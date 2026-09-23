import { useEffect } from "preact/hooks";
import type { EsmeraObject } from "../payload/types.ts";

interface OpenProductDetail {
  product?: EsmeraObject;
}

interface ProductBootstrapResponse {
  fullProduct?: EsmeraObject | null;
}

const PRODUCT_QUERY_PARAM = "produto";

function pathWithoutProduct(url: URL): string {
  const clean = new URL(url.toString());
  clean.searchParams.delete(PRODUCT_QUERY_PARAM);
  const search = clean.searchParams.toString();
  return `${clean.pathname}${search ? `?${search}` : ""}${clean.hash}`;
}

function productSharePath(slug: string): string {
  return `/colecao?${PRODUCT_QUERY_PARAM}=${encodeURIComponent(slug)}`;
}

/**
 * URL/deep-link synchronization belongs to ProductModal. Keeping it in the
 * modal island avoids an additional global hydration root and JS request.
 */
export function useProductModalLinkSync(): void {
  useEffect(() => {
    let returnPath: string | null = null;
    let modalWasOpen = document.body.classList.contains(
      "esv-product-modal-open",
    );
    let retryTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const rememberReturnPath = () => {
      if (returnPath) return;
      returnPath = pathWithoutProduct(new URL(globalThis.location.href));
    };

    const writeProductURL = (slug: string) => {
      const normalizedSlug = slug.trim();
      if (!normalizedSlug) return;
      rememberReturnPath();
      globalThis.history.replaceState(
        globalThis.history.state,
        "",
        productSharePath(normalizedSlug),
      );
    };

    const restoreReturnURL = () => {
      const current = new URL(globalThis.location.href);
      if (!current.searchParams.has(PRODUCT_QUERY_PARAM) && !returnPath) return;
      const target = returnPath ?? pathWithoutProduct(current) ?? "/colecao";
      globalThis.history.replaceState(globalThis.history.state, "", target);
      returnPath = null;
    };

    const onOpenProduct = (event: Event) => {
      const detail = (event as CustomEvent<OpenProductDetail>).detail;
      const slug = detail?.product?.slug?.trim();
      if (slug) writeProductURL(slug);
    };

    globalThis.addEventListener("esmera:open-product", onOpenProduct);

    const observer = new MutationObserver(() => {
      const modalIsOpen = document.body.classList.contains(
        "esv-product-modal-open",
      );
      if (modalWasOpen && !modalIsOpen) restoreReturnURL();
      modalWasOpen = modalIsOpen;
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const initialURL = new URL(globalThis.location.href);
    const initialSlug = initialURL.searchParams.get(PRODUCT_QUERY_PARAM)?.trim();

    if (initialSlug) {
      returnPath = pathWithoutProduct(initialURL) || "/colecao";
      void fetch(
        `/api/esmera-product-detail?slug=${encodeURIComponent(initialSlug)}&full=1`,
        { headers: { accept: "application/json" } },
      )
        .then((response) => {
          if (!response.ok) throw new Error("product bootstrap failed");
          return response.json() as Promise<ProductBootstrapResponse>;
        })
        .then((data) => {
          if (!data.fullProduct) throw new Error("product unavailable");
          const dispatchOpen = () => {
            globalThis.dispatchEvent(
              new CustomEvent("esmera:open-product", {
                detail: { product: data.fullProduct },
              }),
            );
          };
          requestAnimationFrame(() => requestAnimationFrame(dispatchOpen));
          retryTimer = globalThis.setTimeout(() => {
            if (!document.body.classList.contains("esv-product-modal-open")) {
              dispatchOpen();
            }
          }, 250);
        })
        .catch(() => restoreReturnURL());
    }

    return () => {
      if (retryTimer !== null) globalThis.clearTimeout(retryTimer);
      observer.disconnect();
      globalThis.removeEventListener("esmera:open-product", onOpenProduct);
    };
  }, []);
}
