/**
 * Single delegated supervisor for catalog cards, including dynamically appended
 * "Carregar mais" products. No per-card island/hydration cost.
 *
 * Do not infer media filenames. Recovery uses only images provided by the
 * current product's CMS detail endpoint. All attempts are finite.
 */
(() => {
  if (globalThis.__esmeraCardImageHealthInstalled) return;
  globalThis.__esmeraCardImageHealthInstalled = true;

  const selector = ".esv-product-card";
  const mainSelector = ".esv-product-image-primary, .esv-product-image-static";
  const hoverSelector = ".esv-product-image-detail";
  const repaired = new WeakSet();
  const preloaded = new Map();
  const MAX_ALTERNATES = 8;

  function srcOf(image) {
    if (!image) return "";
    return image.currentSrc || image.src || "";
  }

  function safeImageURL(input, host) {
    try {
      const url = new URL(input, document.baseURI);
      if (!["http:", "https:"].includes(url.protocol)) return "";
      // Catalog and gallery are produced by the same trusted CMS media host.
      if (url.host !== host) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function syncHover(card) {
    const primary = card.querySelector(mainSelector);
    const detail = card.querySelector(hoverSelector);
    const primaryReady = Boolean(primary && primary.complete && primary.naturalWidth > 0);
    const detailReady = Boolean(detail && detail.complete && detail.naturalWidth > 0);
    card.classList.toggle(
      "is-hover-ready",
      primaryReady && detailReady && srcOf(primary) !== srcOf(detail),
    );
  }

  function placeholder(card, primary) {
    if (card.querySelector(".esv-product-card-media-placeholder")) return;
    card.classList.remove("is-hover-ready");
    primary?.removeAttribute("src");
    const frame = card.querySelector(".esv-product-media");
    if (!frame) return;
    const label = document.createElement("span");
    label.className = "esv-product-card-media-placeholder";
    label.setAttribute("role", "img");
    label.setAttribute("aria-label", "Imagem do produto temporariamente indisponível");
    label.textContent = "Imagem temporariamente indisponível";
    frame.appendChild(label);
  }

  function preflight(url) {
    if (preloaded.has(url)) return preloaded.get(url);
    const pending = new Promise((resolve) => {
      const image = new Image();
      let finished = false;
      const finish = (ok) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        resolve(ok);
      };
      const timeout = setTimeout(() => finish(false), 10000);
      image.onload = () => finish(image.naturalWidth > 0);
      image.onerror = () => finish(false);
      image.src = url;
      if (image.complete) finish(image.naturalWidth > 0);
    });
    preloaded.set(url, pending);
    return pending;
  }

  async function recoverPrimary(card, primary) {
    if (repaired.has(primary)) {
      placeholder(card, primary);
      return;
    }
    repaired.add(primary);
    card.classList.remove("is-hover-ready");

    const original = srcOf(primary);
    let host = "";
    try {
      host = new URL(original).host;
    } catch {
      placeholder(card, primary);
      return;
    }

    const attempts = [];
    const add = (candidate) => {
      const url = safeImageURL(candidate, host);
      if (url && url !== original && !attempts.includes(url)) attempts.push(url);
    };

    // The complementary photo belongs to the same product.
    const detail = card.querySelector(hoverSelector);
    add(srcOf(detail));

    const slug = card.getAttribute("data-product-slug") || "";
    if (/^[a-z0-9-]+$/.test(slug)) {
      try {
        const response = await fetch(
          "/api/esmera-product-detail?slug=" + encodeURIComponent(slug),
          { headers: { accept: "application/json" }, cache: "no-store" },
        );
        if (response.ok) {
          const body = await response.json();
          for (const item of (body.product?.gallery || []).slice(0, 20)) {
            add(item.url);
          }
        }
      } catch {
        // Fall through to the known same-product image, if one exists.
      }
    }

    for (const candidate of attempts.slice(0, MAX_ALTERNATES)) {
      if (!(await preflight(candidate))) continue;
      if (!card.isConnected) return;
      primary.src = candidate;
      primary.removeAttribute("srcset");
      card.classList.add("is-image-recovered");
      // If the primary fallback is also the hover, never fade it out.
      syncHover(card);
      return;
    }

    if (card.isConnected) placeholder(card, primary);
  }

  function observeCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const primary = card.querySelector(mainSelector);
    const detail = card.querySelector(hoverSelector);
    if (!primary) return;
    syncHover(card);
    if (primary.complete && primary.naturalWidth === 0) {
      void recoverPrimary(card, primary);
    }
    if (detail?.complete && detail.naturalWidth === 0) {
      card.classList.remove("is-hover-ready");
    }
  }

  // load/error don't bubble, but are captured at the document level.
  document.addEventListener("load", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const card = image.closest(selector);
    if (card) syncHover(card);
  }, true);

  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const card = image.closest(selector);
    if (!card) return;
    if (image.matches(hoverSelector)) {
      card.classList.remove("is-hover-ready");
    } else if (image.matches(mainSelector)) {
      void recoverPrimary(card, image);
    }
  }, true);

  function boot() {
    document.querySelectorAll(selector).forEach(observeCard);
    const root = document.body;
    if (!root) return;
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(selector)) observeCard(node);
          node.querySelectorAll?.(selector).forEach(observeCard);
        }
      }
    }).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
