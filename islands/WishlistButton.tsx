import { useEffect, useRef, useState } from "preact/hooks";

export interface WishlistButtonProps {
  productId: string;
  productTitle: string;
}

type WishlistProfile = {
  name: string;
  phone: string;
};

const STORAGE_KEY = "esmera:wishlist";
const PROFILE_STORAGE_KEY = "esmera:wishlist-profile";
const E164_BR_PATTERN = /^55\d{10,11}$/;

function readWishlist(): Set<string> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeWishlist(ids: Set<string>): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Armazenamento indisponível: mantém apenas o estado da sessão.
  }
}

function readProfile(): WishlistProfile | null {
  try {
    const raw = globalThis.localStorage?.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WishlistProfile>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.phone === "string" &&
      parsed.name.trim().length >= 2 &&
      /^\+[1-9]\d{7,14}$/.test(parsed.phone)
    ) {
      return { name: parsed.name.trim(), phone: parsed.phone };
    }
  } catch {
    // Perfil ausente ou inválido.
  }
  return null;
}

function writeProfile(profile: WishlistProfile): void {
  try {
    globalThis.localStorage?.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(profile),
    );
  } catch {
    // O favorito ainda funciona nesta sessão mesmo sem persistência local.
  }
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 || digits.length === 11
    ? `55${digits}`
    : digits;
  return E164_BR_PATTERN.test(withCountryCode) ? `+${withCountryCode}` : null;
}

function publishSync(productId: string, favorited: boolean) {
  globalThis.dispatchEvent(
    new CustomEvent("esmera:wishlist-sync", {
      detail: { id: productId, favorited },
    }),
  );
}

function setLocalFavorite(productId: string, favorited: boolean) {
  const ids = readWishlist();
  if (favorited) ids.add(productId);
  else ids.delete(productId);
  writeWishlist(ids);
  publishSync(productId, favorited);
}

async function syncLeadFavorite(
  profile: WishlistProfile,
  productId: string,
  action: "add" | "remove",
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/esmera-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          productId,
          action,
        }),
      });
      if (response.ok) return;
    } catch {
      // Retry once without exposing network latency to the customer.
    }
    if (attempt === 0) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
    }
  }
}

export default function WishlistButton(
  { productId, productTitle }: WishlistButtonProps,
) {
  const [favorited, setFavorited] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setFavorited(readWishlist().has(productId));
    const profile = readProfile();
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone.replace(/^\+55/, ""));
    }

    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; favorited: boolean }>)
        .detail;
      if (detail?.id === productId) setFavorited(detail.favorited);
    };
    globalThis.addEventListener("esmera:wishlist-sync", onSync);
    return () => globalThis.removeEventListener("esmera:wishlist-sync", onSync);
  }, [productId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) dialog.showModal();
    if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  const saveState = (next: boolean) => {
    setLocalFavorite(productId, next);
    setFavorited(next);
  };

  const openCapture = () => {
    const profile = readProfile();
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone.replace(/^\+55/, ""));
    }
    setFeedback("");
    setDialogOpen(true);
  };

  const toggle = () => {
    if (favorited) {
      saveState(false);
      const profile = readProfile();
      if (profile) void syncLeadFavorite(profile, productId, "remove");
      return;
    }

    const profile = readProfile();
    if (!profile) {
      openCapture();
      return;
    }

    saveState(true);
    void syncLeadFavorite(profile, productId, "add");
  };

  const submit = (event: Event) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedPhone = normalizePhone(phone);
    if (normalizedName.length < 2) {
      setFeedback("Informe seu nome.");
      return;
    }
    if (!normalizedPhone) {
      setFeedback("Informe um WhatsApp válido, com DDD.");
      return;
    }

    const profile = { name: normalizedName, phone: normalizedPhone };
    setFeedback("");
    writeProfile(profile);
    saveState(true);
    setDialogOpen(false);
    void syncLeadFavorite(profile, productId, "add");
  };

  return (
    <>
      <button
        type="button"
        class="esv-card-wishlist"
        aria-pressed={favorited ? "true" : "false"}
        aria-label={favorited
          ? `Remover ${productTitle} dos favoritos`
          : `Adicionar ${productTitle} aos favoritos`}
        data-favorited={favorited ? "true" : "false"}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M12 20.5 4.6 13a4.5 4.5 0 0 1 6.4-6.3l1 1 1-1a4.5 4.5 0 0 1 6.4 6.3Z"
            fill={favorited ? "currentColor" : "none"}
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        class="esv-wishlist-dialog"
        aria-labelledby={`wishlist-title-${productId}`}
        onCancel={() => setDialogOpen(false)}
        onClose={() => setDialogOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDialogOpen(false);
        }}
      >
        <form class="esv-wishlist-dialog-card" onSubmit={(event) => void submit(event)}>
          <button
            class="esv-wishlist-dialog-close"
            type="button"
            aria-label="Fechar"
            onClick={() => setDialogOpen(false)}
          >
            ×
          </button>

          <p class="esv-kicker">FAVORITOS</p>
          <h2 id={`wishlist-title-${productId}`}>
            Salve suas peças favoritas.
          </h2>
          <p class="esv-wishlist-dialog-copy">
            Informe seu nome e WhatsApp para salvar seus favoritos.
          </p>

          <label>
            <span>Nome</span>
            <input
              type="text"
              name="name"
              autocomplete="name"
              maxlength={80}
              required
              value={name}
              onInput={(event) => setName(event.currentTarget.value)}
              placeholder="Seu nome"
            />
          </label>

          <label>
            <span>WhatsApp</span>
            <input
              type="tel"
              name="phone"
              inputmode="tel"
              autocomplete="tel"
              required
              value={phone}
              onInput={(event) => setPhone(event.currentTarget.value)}
              placeholder="(87) 99999-9999"
            />
          </label>

          {feedback && (
            <p class="esv-wishlist-dialog-feedback" role="alert">
              {feedback}
            </p>
          )}

          <button
            class="esv-wishlist-dialog-submit"
            type="submit"
          >
            Salvar nos favoritos
          </button>
        </form>
      </dialog>
    </>
  );
}
