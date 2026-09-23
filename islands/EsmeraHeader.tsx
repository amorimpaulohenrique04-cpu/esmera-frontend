import { useEffect, useRef, useState } from "preact/hooks";
import DynamicMenu from "./DynamicMenu.tsx";
import type { HeaderVariant } from "../lib/esmera/shellData.ts";
import type { NavigationNode } from "../lib/payload/navigation.ts";
import type { EsmeraObject, EsmeraVariant } from "../lib/payload/types.ts";
import { useMenuNavigationCoordinator } from "../lib/esmera/useMenuNavigationCoordinator.ts";

type Overlay = "search" | "enquiry" | null;
type OverlayPhase = "closed" | "opening" | "open" | "closing";
type HeaderSurface = "hero" | "solid" | "mega";
type CartItem = {
  product: EsmeraObject;
  quantity: number;
  variant?: EsmeraVariant;
};
type StoredCartItem = {
  id: string;
  slug: string;
  title: string;
  image: string;
  alt: string;
  availability: EsmeraObject["availability"];
  priceMode: "fixed" | "inquiry";
  priceCents: number | null;
  formattedPrice: string;
  quantity: number;
  variant?: {
    sku: string;
    label: string;
    priceMode: "fixed" | "inquiry";
    priceCents: number | null;
    formattedPrice: string;
  };
};

export interface Props {
  logo: string;
  enquiryLabel: string;
  whatsappHref: string;
  menu?: NavigationNode[];
  instagramHref?: string;
  variant?: HeaderVariant;
}

const CART_STORAGE_KEY = "esmera-cart-v2";
const OVERLAY_EXIT_FALLBACK_MS = 210;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const emptyProduct = (item: StoredCartItem): EsmeraObject => ({
  id: item.id,
  slug: item.slug,
  code: "",
  title: item.title,
  image: item.image,
  alt: item.alt,
  gallery: [{
    url: item.image,
    alt: item.alt,
    key: "cart",
    role: "cover",
  }],
  availability: item.availability,
  attributes: [],
  priceMode: item.priceMode,
  priceCents: item.priceCents,
  formattedPrice: item.formattedPrice,
  isInquiry: item.priceMode === "inquiry",
  variants: [],
  seo: { title: "", description: "", noindex: false },
  price: item.formattedPrice,
});

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

const cartItemKey = (item: CartItem) =>
  `${item.product.id}:${item.variant?.sku ?? "base"}`;

function checkoutHref(base: string, message: string) {
  if (!base) return "";
  try {
    const url = new URL(base);
    url.searchParams.set("text", message);
    return url.toString();
  } catch {
    return "";
  }
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
      <circle
        cx="10.5"
        cy="10.5"
        r="5.75"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
      <path
        d="m15 15 4.25 4.25"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.4"
      />
    </svg>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
      <path
        d="M12 20.25 4.8 13a4.55 4.55 0 0 1 6.45-6.4L12 7.35l.75-.75A4.55 4.55 0 0 1 19.2 13Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M5.5 8.5h13l-1 11h-11l-1-11Z"
        fill="none"
        stroke="currentColor"
        stroke-linejoin="round"
        stroke-width="1.4"
      />
      <path
        d="M9 9V6.75a3 3 0 0 1 6 0V9"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.4"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M5 5l14 14M19 5 5 19"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.35"
      />
    </svg>
  );
}

export default function EsmeraHeader({
  logo,
  enquiryLabel,
  whatsappHref,
  menu = [],
  instagramHref = "",
  variant = "solid",
}: Props) {
  useMenuNavigationCoordinator();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>("closed");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EsmeraObject[]>([]);
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [desktopMenuHovered, setDesktopMenuHovered] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const overlayExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayAfterClose = useRef<(() => void) | null>(null);
  const overlayHandoffRef = useRef(false);

  const clearOverlayExit = () => {
    if (overlayExitTimer.current !== null) {
      globalThis.clearTimeout(overlayExitTimer.current);
      overlayExitTimer.current = null;
    }
  };

  const finalizeOverlayClose = () => {
    clearOverlayExit();
    setOverlayPhase("closed");
    setOverlay(null);
    const afterClose = overlayAfterClose.current;
    overlayAfterClose.current = null;
    if (afterClose) globalThis.setTimeout(afterClose, 0);
  };

  const closeAll = (afterClose?: () => void) => {
    if (!overlay || overlayPhase === "closing") return;
    overlayAfterClose.current = afterClose ?? null;
    setOverlayPhase("closing");
    overlayExitTimer.current = globalThis.setTimeout(
      finalizeOverlayClose,
      OVERLAY_EXIT_FALLBACK_MS,
    );
  };

  const openOverlay = (next: Exclude<Overlay, null>, trigger?: HTMLElement) => {
    clearOverlayExit();
    overlayAfterClose.current = null;
    if (trigger) lastTriggerRef.current = trigger;
    setOverlay(next);
    setOverlayPhase("opening");
    requestAnimationFrame(() => setOverlayPhase("open"));
  };

  const addToCart = (product: EsmeraObject, variant?: EsmeraVariant) => {
    const key = `${product.id}:${variant?.sku ?? "base"}`;
    setCart((current) => {
      const existing = current.find((item) => cartItemKey(item) === key);
      if (!existing) return [...current, { product, variant, quantity: 1 }];
      return current.map((item) =>
        cartItemKey(item) === key
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });
  };

  useEffect(() => () => clearOverlayExit(), []);

  useEffect(() => {
    const updateWishlistCount = () => {
      try {
        const raw = globalThis.localStorage?.getItem("esmera:wishlist");
        const parsed = raw ? JSON.parse(raw) : [];
        setWishlistCount(
          Array.isArray(parsed) ? new Set(parsed.map(String)).size : 0,
        );
      } catch {
        setWishlistCount(0);
      }
    };

    updateWishlistCount();
    globalThis.addEventListener("esmera:wishlist-sync", updateWishlistCount);
    globalThis.addEventListener("storage", updateWishlistCount);
    return () => {
      globalThis.removeEventListener(
        "esmera:wishlist-sync",
        updateWishlistCount,
      );
      globalThis.removeEventListener("storage", updateWishlistCount);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (document.body.style.position === "fixed") return;
      setIsScrolled((previous) => {
        const y = globalThis.scrollY || 0;
        return previous ? y > 8 : y > 24;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    globalThis.addEventListener("scroll", schedule, { passive: true });
    globalThis.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      globalThis.removeEventListener("scroll", schedule);
      globalThis.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    if (!overlay || overlayPhase === "closing") return;
    const body = document.body;
    const root = document.documentElement;
    const handoff = overlayHandoffRef.current;
    overlayHandoffRef.current = false;
    const lockedScrollY = Math.abs(Number.parseInt(body.style.top || "0", 10));
    const scrollY = handoff ? lockedScrollY : globalThis.scrollY || 0;
    const previous = {
      position: handoff ? "" : body.style.position,
      top: handoff ? "" : body.style.top,
      left: handoff ? "" : body.style.left,
      right: handoff ? "" : body.style.right,
      width: handoff ? "" : body.style.width,
      overflow: handoff ? "" : body.style.overflow,
    };

    root.classList.add("esv-overlay-active");
    body.classList.add("esv-overlay-open");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    const dialog = panelRef.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) =>
        !element.hasAttribute("disabled") && element.offsetParent !== null
      );
    const frame = requestAnimationFrame(() => {
      const preferred = dialog?.querySelector<HTMLElement>("[data-autofocus]");
      (preferred ?? focusables()[0])?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAll();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      globalThis.removeEventListener("keydown", onKeyDown);
      root.classList.remove("esv-overlay-active");
      body.classList.remove("esv-overlay-open");
      if (root.classList.contains("esv-product-modal-active")) return;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      globalThis.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
      globalThis.setTimeout(() => lastTriggerRef.current?.focus(), 0);
    };
  }, [overlay, overlayPhase]);

  useEffect(() => {
    if (overlay !== "search" || overlayPhase === "closing") return;
    const frame = requestAnimationFrame(() => searchInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [overlay, overlayPhase]);

  useEffect(() => {
    try {
      const raw = globalThis.localStorage?.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as StoredCartItem[] : [];
      if (Array.isArray(parsed)) {
        setCart(
          parsed.filter((item) => item.id && item.quantity > 0).map((item) => ({
            product: emptyProduct(item),
            quantity: item.quantity,
            variant: item.variant
              ? {
                ...item.variant,
                isInquiry: item.variant.priceMode === "inquiry",
                disabled: false,
                mediaKeys: [],
              }
              : undefined,
          })),
        );
      }
    } catch {
      // Storage is optional progressive enhancement.
    } finally {
      setCartReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    const stored: StoredCartItem[] = cart.map((
      { product, quantity, variant },
    ) => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      image: product.image,
      alt: product.alt,
      availability: product.availability,
      priceMode: product.priceMode,
      priceCents: product.priceCents,
      formattedPrice: product.formattedPrice,
      quantity,
      variant: variant
        ? {
          sku: variant.sku,
          label: variant.label,
          priceMode: variant.priceMode,
          priceCents: variant.priceCents,
          formattedPrice: variant.formattedPrice,
        }
        : undefined,
    }));
    try {
      globalThis.localStorage?.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(stored),
      );
    } catch {
      // Ignore quota/privacy errors.
    }
  }, [cart, cartReady]);

  useEffect(() => {
    requestRef.current?.abort();
    if (overlay !== "search" || overlayPhase === "closing") return;
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      setSearchState("idle");
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = globalThis.setTimeout(async () => {
      setSearchState("loading");
      try {
        const response = await fetch(
          `/api/esmera-search?q=${encodeURIComponent(normalized)}`,
          {
            signal: controller.signal,
            headers: { accept: "application/json" },
          },
        );
        if (!response.ok) throw new Error("search failed");
        const data = await response.json() as { items?: EsmeraObject[] };
        setResults(Array.isArray(data.items) ? data.items.slice(0, 8) : []);
        setSearchState("ready");
      } catch {
        if (!controller.signal.aborted) setSearchState("error");
      }
    }, 220);
    return () => {
      globalThis.clearTimeout(timer);
      controller.abort();
    };
  }, [query, overlay, overlayPhase]);

  useEffect(() => {
    const add = (event: Event) => {
      const detail = (event as CustomEvent<{
        product?: EsmeraObject;
        handoff?: boolean;
      }>).detail;
      const product = detail?.product;
      if (!product) return;
      addToCart(product, product.variants.find((variant) => !variant.disabled));
      overlayHandoffRef.current = Boolean(detail?.handoff);
      openOverlay("enquiry");
    };
    globalThis.addEventListener("esmera:add-to-enquiry", add);
    return () => globalThis.removeEventListener("esmera:add-to-enquiry", add);
  }, []);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce(
    (total, item) =>
      total +
      ((item.variant?.priceCents ?? item.product.priceCents) ?? 0) *
        item.quantity,
    0,
  );
  const hasInquiry = cart.some((item) =>
    (item.variant?.priceMode ?? item.product.priceMode) === "inquiry"
  );
  const message = [
    "Olá, gostaria de finalizar este carrinho Esméra:",
    ...cart.map(({ product, quantity, variant }) =>
      `${quantity}x ${product.title}${variant ? ` — ${variant.label}` : ""} — ${
        variant?.formattedPrice ?? product.formattedPrice
      }`
    ),
    subtotal > 0 ? `Subtotal estimado: ${formatBRL(subtotal)}` : "",
    hasInquiry ? "Itens sob consulta serão confirmados pela curadoria." : "",
  ].filter(Boolean).join("\n");
  const sendHref = checkoutHref(whatsappHref, message);
  const headerSurface: HeaderSurface = megaOpen || desktopMenuHovered
    ? "mega"
    : variant === "solid" || isScrolled
    ? "solid"
    : "hero";
  const isSolid = headerSurface !== "hero";
  const overlayTitle = overlay === "search" ? "Busca" : "Carrinho";

  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!themeColor) return;
    themeColor.content = headerSurface === "hero" ? "#111210" : "#F3F0E8";
  }, [headerSurface]);

  const openSearchProduct = (product: EsmeraObject) => {
    const trigger = document.querySelector<HTMLElement>(".esv-search-trigger");
    closeAll();
    globalThis.dispatchEvent(
      new CustomEvent("esmera:open-product", {
        detail: { product, trigger: trigger ?? undefined, handoff: true },
      }),
    );
  };

  return (
    <>
      <header
        class={`esv-header${isSolid ? " is-solid" : ""}${
          megaOpen ? " is-mega-open" : ""
        }`}
        data-header-variant={variant}
        data-header-state={isSolid ? "solid" : "transparent"}
        data-header-surface={headerSurface}
      >
        <DynamicMenu
          items={menu}
          whatsappHref={whatsappHref}
          instagramHref={instagramHref}
          onMegaChange={setMegaOpen}
          onDesktopHoverChange={setDesktopMenuHovered}
        />
        <a class="esv-wordmark" aria-label={`${logo} — início`} href="/">
          <img
            class="esv-brand-image esv-header-logo-image"
            src="/esmera-logo.png"
            alt=""
            width="1225"
            height="369"
            loading="eager"
            decoding="async"
            style={isSolid ? undefined : "filter:brightness(0) invert(1)"}
          />
        </a>
        <div class="esv-header-actions">
          <button
            class="esv-header-icon esv-search-trigger"
            type="button"
            aria-label="Buscar objetos"
            aria-expanded={overlay === "search" && overlayPhase !== "closing"}
            onClick={(event) => openOverlay("search", event.currentTarget)}
          >
            <SearchIcon />
          </button>
          <a
            class="esv-header-icon esv-wishlist-header-link"
            href="/favoritos"
            aria-label={wishlistCount > 0
              ? `Meus favoritos, ${wishlistCount} ${
                wishlistCount === 1 ? "peça" : "peças"
              }`
              : "Meus favoritos"}
            title="Meus favoritos"
          >
            <HeartIcon filled={wishlistCount > 0} />
            {wishlistCount > 0 && (
              <sup key={wishlistCount} aria-live="polite">{wishlistCount}</sup>
            )}
          </a>
          <button
            class="esv-enquiry-link esv-cart-link"
            type="button"
            aria-label={`${enquiryLabel}, ${cartCount} itens`}
            aria-expanded={overlay === "enquiry" && overlayPhase !== "closing"}
            onClick={(event) => openOverlay("enquiry", event.currentTarget)}
          >
            <span class="esv-cart-label">{enquiryLabel}</span>
            <span class="esv-cart-icon">
              <BagIcon />
            </span>
            <sup key={cartCount} aria-live="polite">{cartCount}</sup>
          </button>
        </div>
      </header>

      {overlay && (
        <div
          class={`esv-header-overlay esv-header-overlay-${overlay}${
            overlayPhase === "closing" ? " is-closing" : ""
          }`}
          role="presentation"
          data-phase={overlayPhase}
          onClick={() => closeAll()}
        >
          <aside
            ref={panelRef}
            class={`esv-header-panel esv-header-panel-${overlay}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="esv-overlay-title"
            onClick={(event) => event.stopPropagation()}
            onAnimationEnd={(event) => {
              if (
                overlayPhase === "closing" &&
                event.currentTarget === event.target
              ) {
                finalizeOverlayClose();
              }
            }}
          >
            <div class="esv-panel-header">
              <a
                class="esv-panel-wordmark"
                href="/"
                aria-label={`${logo} — início`}
              >
                <img
                  class="esv-brand-image esv-panel-logo-image"
                  src="/esmera-logo.png"
                  alt=""
                  width="1225"
                  height="369"
                  decoding="async"
                />
              </a>
              <span id="esv-overlay-title" class="esv-sr-only">
                {overlayTitle}
              </span>
              <button
                class="esv-panel-close"
                type="button"
                aria-label={`Fechar ${overlayTitle.toLowerCase()}`}
                onClick={() => closeAll()}
              >
                <CloseIcon />
              </button>
            </div>

            {overlay === "search" && (
              <div class="esv-header-search" role="search">
                <div class="esv-panel-intro">
                  <p class="esv-kicker">Busca</p>
                  <h2>Encontrar um objeto</h2>
                </div>
                <label class="esv-sr-only" for="esv-search-input">
                  Buscar por nome, código ou material
                </label>
                <div class="esv-search-field">
                  <SearchIcon />
                  <input
                    ref={searchInput}
                    id="esv-search-input"
                    value={query}
                    onInput={(event) =>
                      setQuery(event.currentTarget.value)}
                    autocomplete="off"
                    inputmode="search"
                    placeholder="Nome, código ou material"
                    data-autofocus="true"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Limpar busca"
                      onClick={() => setQuery("")}
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div class="esv-search-status" aria-live="polite">
                  {searchState === "loading" && <p>Buscando…</p>}
                  {searchState === "error" && (
                    <p role="alert">Não foi possível buscar agora.</p>
                  )}
                  {searchState === "idle" && (
                    <p>Digite ao menos dois caracteres.</p>
                  )}
                </div>
                <div class="esv-search-results">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openSearchProduct(item)}
                    >
                      <img src={item.image} alt="" width="72" height="88" />
                      <span>
                        <small>{item.material || item.code}</small>
                        <strong>{item.title}</strong>
                        <em>{item.formattedPrice}</em>
                      </span>
                    </button>
                  ))}
                  {searchState === "ready" && results.length === 0 && (
                    <p class="esv-search-empty">Nenhum objeto encontrado.</p>
                  )}
                </div>
              </div>
            )}

            {overlay === "enquiry" && (
              <div class="esv-enquiry-panel esv-cart-panel">
                <div class="esv-panel-intro">
                  <p class="esv-kicker">Carrinho</p>
                  <h2>Seleção atual</h2>
                </div>
                {cart.length === 0
                  ? (
                    <div class="esv-cart-empty">
                      <p>Seu carrinho está vazio.</p>
                      <a href="/colecao">Explorar objetos</a>
                    </div>
                  )
                  : (
                    <>
                      <div class="esv-enquiry-list esv-cart-list">
                        {cart.map((item) => {
                          const key = cartItemKey(item);
                          return (
                            <div class="esv-cart-item" key={key}>
                              <a
                                class="esv-cart-item-media"
                                href={`/produto/${item.product.slug}`}
                              >
                                <img
                                  src={item.product.image}
                                  alt=""
                                  width="74"
                                  height="90"
                                />
                              </a>
                              <span class="esv-cart-item-copy">
                                <strong>{item.product.title}</strong>
                                {item.variant?.label && (
                                  <small>{item.variant.label}</small>
                                )}
                                <em class="esv-cart-item-price">
                                  {item.variant?.formattedPrice ??
                                    item.product.formattedPrice}
                                </em>
                              </span>
                              <div class="esv-cart-item-actions">
                                <div
                                  class="esv-cart-quantity"
                                  aria-label="Quantidade"
                                >
                                  <button
                                    type="button"
                                    aria-label={`Diminuir quantidade de ${item.product.title}`}
                                    disabled={item.quantity <= 1}
                                    onClick={() =>
                                      setCart((current) =>
                                        current.map((candidate) =>
                                          cartItemKey(candidate) === key
                                            ? {
                                              ...candidate,
                                              quantity: Math.max(
                                                1,
                                                candidate.quantity - 1,
                                              ),
                                            }
                                            : candidate
                                        )
                                      )}
                                  >
                                    −
                                  </button>
                                  <span>{item.quantity}</span>
                                  <button
                                    type="button"
                                    aria-label={`Aumentar quantidade de ${item.product.title}`}
                                    onClick={() =>
                                      setCart((current) =>
                                        current.map((candidate) =>
                                          cartItemKey(candidate) === key
                                            ? {
                                              ...candidate,
                                              quantity: candidate.quantity + 1,
                                            }
                                            : candidate
                                        )
                                      )}
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  class="esv-cart-remove"
                                  type="button"
                                  onClick={() =>
                                    setCart((current) =>
                                      current.filter((candidate) =>
                                        cartItemKey(candidate) !== key
                                      )
                                    )}
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div class="esv-cart-summary">
                        {subtotal > 0 && (
                          <div>
                            <span>Subtotal estimado</span>
                            <strong>{formatBRL(subtotal)}</strong>
                          </div>
                        )}
                        <p>
                          A disponibilidade e os detalhes finais são confirmados
                          pela curadoria.
                        </p>
                      </div>
                      {sendHref
                        ? (
                          <a
                            class="esv-enquiry-send esv-cart-checkout"
                            href={sendHref}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Finalizar pelo WhatsApp
                            <span aria-hidden="true">↗</span>
                          </a>
                        )
                        : (
                          <p class="esv-cart-channel-unavailable">
                            Canal de atendimento temporariamente indisponível.
                          </p>
                        )}
                    </>
                  )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
