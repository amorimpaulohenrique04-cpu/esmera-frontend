let modalStylesPromise: Promise<void> | null = null;

function modalStylesHref(): string {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="esmera-product-modal-css"]',
  );
  return meta?.content || "/esmera-product-modal.css";
}

/**
 * Product modal CSS is intentionally removed from the render-blocking path.
 * The first interaction promotes it to a real stylesheet; pointer warmup on
 * cards normally starts this before the modal-open event fires.
 */
export function ensureProductModalStyles(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const existing = document.querySelector<HTMLLinkElement>(
    'link[data-esmera-product-modal-style="true"]',
  );
  if (existing?.sheet) return Promise.resolve();
  if (modalStylesPromise) return modalStylesPromise;

  const link = existing ?? document.createElement("link");
  link.rel = "stylesheet";
  link.href = modalStylesHref();
  link.dataset.esmeraProductModalStyle = "true";

  modalStylesPromise = new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    link.addEventListener("load", finish, { once: true });
    link.addEventListener("error", finish, { once: true });
    globalThis.setTimeout(finish, 800);
  });

  if (!existing) document.head.append(link);
  return modalStylesPromise;
}
