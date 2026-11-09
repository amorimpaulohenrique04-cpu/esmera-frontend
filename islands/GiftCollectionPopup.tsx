import { asset } from "$fresh/runtime.ts";
import { useEffect, useRef, useState } from "preact/hooks";

const SESSION_KEY = "esmera:gift-popup-seen";
const OPEN_DELAY_MS = 1_500;
const RETRY_MS = 3_000;
const CLOSE_ANIMATION_MS = 220;

const BENEFITS = [
  {
    label: "Presentes com propósito",
    icon: (
      <>
        <path d="M4 11h24v5H4zM6 16v12h20V16M16 11v17" />
        <path d="M16 11c-2-6-9-7-9-3 0 3 5 3 9 3Zm0 0c2-6 9-7 9-3 0 3-5 3-9 3Z" />
      </>
    ),
  },
  {
    label: "Pedras naturais",
    icon: (
      <>
        <path d="M6 26C5 13 14 5 27 5c1 13-7 22-18 20" />
        <path d="M5 28c4-8 9-13 16-17M13 17l-1-5M17 14l5 1M10 22l6 1" />
      </>
    ),
  },
  {
    label: "Produção artesanal",
    icon: (
      <>
        <path d="M10 6h12l6 7-12 14L4 13z" />
        <path d="M4 13h24M12 13l4 14 4-14-4-7z" />
      </>
    ),
  },
];

function canShowPopup(): boolean {
  try {
    return !globalThis.sessionStorage.getItem(SESSION_KEY);
  } catch {
    // Sem como lembrar da sessão, o popup apareceria em toda página.
    return false;
  }
}

function markSeen() {
  try {
    globalThis.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Sem armazenamento, canShowPopup já impede novas aberturas.
  }
}

function isVisitorBusy(): boolean {
  const body = document.body.classList;
  const active = document.activeElement as HTMLElement | null;
  return document.hidden ||
    body.contains("esv-overlay-open") ||
    body.contains("esv-product-modal-open") ||
    !!active?.matches?.("input, textarea, select, [contenteditable='true']");
}

export default function GiftCollectionPopup() {
  const [state, setState] = useState<"hidden" | "open" | "closing">("hidden");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const image = asset("/presenteaveis-popup.webp");

  useEffect(() => {
    if (!canShowPopup()) return;

    let timer: ReturnType<typeof setTimeout>;
    let settled = false;

    const attempt = () => {
      if (settled) return;
      if (isVisitorBusy()) {
        timer = setTimeout(attempt, RETRY_MS);
        return;
      }
      settled = true;
      const photo = new Image();
      photo.src = image;
      photo.decode().then(() => {
        previousFocusRef.current = document.activeElement as HTMLElement | null;
        markSeen();
        setState("open");
      }).catch(() => {});
    };

    timer = setTimeout(attempt, OPEN_DELAY_MS);
    return () => {
      settled = true;
      clearTimeout(timer);
    };
  }, []);

  const close = () => {
    setState("closing");
    setTimeout(() => setState("hidden"), CLOSE_ANIMATION_MS);
  };

  const isOpen = state === "open";
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const body = document.body;
    const previousOverflow = root.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = globalThis.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  if (state === "hidden") return null;

  return (
    <div
      class={`egp-backdrop${state === "closing" ? " is-closing" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        class="egp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="egp-title"
        aria-describedby="egp-description"
      >
        <button
          ref={closeRef}
          type="button"
          class="egp-close"
          aria-label="Fechar"
          onClick={close}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3l10 10M13 3 3 13" />
          </svg>
        </button>
        <div class="egp-media">
          <img
            src={image}
            alt="Mão segurando uma caixa verde da Esméra com laço dourado e cartão"
            width={1448}
            height={1086}
          />
        </div>
        <div class="egp-panel">
          <p class="egp-kicker">Coleção</p>
          <h2 id="egp-title" class="egp-title">Presenteáveis</h2>
          <span class="egp-rule" aria-hidden="true" />
          <p id="egp-description" class="egp-copy">
            Peças especiais para presentear com significado e exclusividade.
          </p>
          <ul class="egp-benefits">
            {BENEFITS.map((item) => (
              <li key={item.label}>
                <svg viewBox="0 0 32 32" aria-hidden="true">{item.icon}</svg>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <a class="egp-cta" href="/colecao/presenteaveis">
            Conhecer a coleção
            <svg viewBox="0 0 28 12" aria-hidden="true">
              <path d="M0 6h26M21 1l5 5-5 5" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
