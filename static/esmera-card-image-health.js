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
  const repaired = new WeakMap();
  const recovering = new WeakSet();
  const details = new Map();
  const preloaded = new Map();
  const MAX_ALTERNATES = 8;

  function srcOf(image) {
    if (!image) return "";
    return image.currentSrc || image.src || "";
  }

  function safeImageURL(input, host) {
    if (typeof input !== "string" || !input.trim()) return "";
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

  // Unwrap only a same-origin Next proxy whose source is a CMS media URL.
  // The source is supplied by the URL itself; no filenames are reconstructed.
  function directSource(input, host) {
    const safe = safeImageURL(input, host);
    if (!safe) return "";
    const url = new URL(safe);
    if (url.pathname !== "/_next/image") return safe;
    const source = safeImageURL(url.searchParams.get("url"), host);
    return source && new URL(source).pathname.startsWith("/api/media/file/")
      ? source : "";
  }

  function galleryFor(card) {
    const slug = card.getAttribute("data-product-slug") || "";
    if (!/^[a-z0-9-]+$/.test(slug)) return Promise.resolve([]);
    if (!details.has(slug)) {
      details.set(slug, (async () => {
        try {
          const response = await fetch(
            "/api/esmera-product-detail?slug=" + encodeURIComponent(slug),
            { headers: { accept: "application/json" }, cache: "no-store" },
          );
          if (response.ok) {
            const body = await response.json();
            return (body.product?.gallery || []).slice(0, 20);
          }
        } catch {
          // A failed detail request must not hide an already loaded cover.
        }
        return [];
      })());
    }
    return details.get(slug);
  }

  async function recoverImage(card, image) {
    // DOM insertion and the captured error can report the same failed image.
    // Never replace an in-flight recovery with a placeholder.
    const requested = image.getAttribute("src") || "";
    if (recovering.has(image) || repaired.get(image) === requested) return;
    recovering.add(image);
    const isPrimary = image.matches(mainSelector);
    card.classList.remove("is-hover-ready");
    const original = srcOf(image);
    let host = "";
    try {
      host = new URL(original, document.baseURI).host;
    } catch {
      recovering.delete(image);
      return;
    }
    let applied = false;
    const attempts = [];
    const add = (candidate) => {
      const url = directSource(candidate, host);
      if (url && url !== original && !attempts.includes(url)) attempts.push(url);
    };
    const other = card.querySelector(isPrimary ? hoverSelector : mainSelector);
    // Preserve the requested photo first, before trying other gallery photos.
    add(image.getAttribute("data-original-src"));
    add(original);
    add(image.getAttribute("src"));
    const apply = async (candidate) => {
      if (!(await preflight(candidate)) || !card.isConnected) return false;
      // A filter update may reuse this node while recovery is in flight.
      if ((image.getAttribute("src") || "") !== requested) return false;
      if (!isPrimary && candidate === srcOf(other)) return false;
      image.removeAttribute("srcset");
      image.src = candidate;
      applied = true;
      if (isPrimary) {
        card.classList.add("is-image-recovered");
        card.querySelector(".esv-product-card-media-placeholder")?.remove();
      }
      syncHover(card);
      return true;
    };
    try {
      for (const candidate of attempts) {
        if (await apply(candidate)) return;
      }
      const gallery = await galleryFor(card);
      // Prefer a distinct complementary photo for hover; do not swap it to
      // the loaded cover or disable a working cover while recovery runs.
      for (const item of gallery) {
        add(item.url);
        add(item.fullUrl);
      }
      if (isPrimary) add(srcOf(other));
      for (const candidate of attempts.slice(0, MAX_ALTERNATES)) {
        if (await apply(candidate)) return;
      }
      if (image.complete && image.naturalWidth > 0) {
        syncHover(card);
      } else if (isPrimary && card.isConnected &&
        (image.getAttribute("src") || "") === requested) {
        placeholder(card, image);
      }
    } finally {
      recovering.delete(image);
      if (applied || (image.getAttribute("src") || "") === requested ||
        card.querySelector(".esv-product-card-media-placeholder")) {
        repaired.set(image, image.getAttribute("src") || "");
      } else {
        observeCard(card);
      }
    }
  }

  function observeCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const primary = card.querySelector(mainSelector);
    const detail = card.querySelector(hoverSelector);
    if (!primary) return;
    syncHover(card);
    if (primary.complete && primary.naturalWidth === 0) {
      void recoverImage(card, primary);
    }
    if (detail?.complete && detail.naturalWidth === 0) {
      void recoverImage(card, detail);
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
    if (image.matches(hoverSelector) || image.matches(mainSelector)) {
      void recoverImage(card, image);
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
