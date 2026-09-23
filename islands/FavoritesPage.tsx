import { useEffect, useMemo, useState } from "preact/hooks";
import type { EsmeraObject } from "../lib/payload/types.ts";

type WishlistProfile = {
  name: string;
  phone: string;
};

const STORAGE_KEY = "esmera:wishlist";
const PROFILE_STORAGE_KEY = "esmera:wishlist-profile";

function readIDs(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(String).filter((id) => /^\d+$/.test(id))
      : [];
  } catch {
    return [];
  }
}

function writeIDs(ids: string[]) {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify([...new Set(ids)]),
    );
  } catch {
    // A lista permanece em memória enquanto o navegador estiver aberto.
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
    // Perfil opcional.
  }
  return null;
}

function availabilityLabel(value: EsmeraObject["availability"]) {
  if (value === "unique") return "Peça única";
  if (value === "made_to_order") return "Sob encomenda";
  if (value === "limited") return "Edição limitada";
  if (value === "archive") return "Indisponível";
  return "Disponível";
}

async function syncRemoval(profile: WishlistProfile, productId: string) {
  try {
    const response = await fetch("/api/esmera-lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        productId,
        action: "remove",
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default function FavoritesPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<EsmeraObject[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const orderedItems = ids
    .map((id) => itemMap.get(id))
    .filter((item): item is EsmeraObject => Boolean(item));

  const load = async (nextIds: string[]) => {
    setIds(nextIds);
    if (nextIds.length === 0) {
      setItems([]);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch(
        `/api/esmera-favorites?ids=${encodeURIComponent(nextIds.join(","))}`,
        { headers: { accept: "application/json" } },
      );
      if (!response.ok) throw new Error("favorites unavailable");
      const data = await response.json() as { items?: EsmeraObject[] };
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    void load(readIDs());

    const onSync = () => {
      void load(readIDs());
    };
    globalThis.addEventListener("esmera:wishlist-sync", onSync);
    return () => globalThis.removeEventListener("esmera:wishlist-sync", onSync);
  }, []);

  const remove = async (product: EsmeraObject) => {
    if (busyId) return;
    setBusyId(product.id);
    setFeedback("");

    const profile = readProfile();
    if (profile) {
      const synced = await syncRemoval(profile, product.id);
      if (!synced) {
        setFeedback(
          "Não foi possível atualizar sua seleção agora. Tente novamente.",
        );
        setBusyId(null);
        return;
      }
    }

    const next = ids.filter((id) => id !== product.id);
    writeIDs(next);
    setIds(next);
    setItems((current) => current.filter((item) => item.id !== product.id));
    globalThis.dispatchEvent(
      new CustomEvent("esmera:wishlist-sync", {
        detail: { id: product.id, favorited: false },
      }),
    );
    setBusyId(null);
  };

  const addToCart = (product: EsmeraObject) => {
    globalThis.dispatchEvent(
      new CustomEvent("esmera:add-to-enquiry", {
        detail: { product },
      }),
    );
  };

  if (status === "loading") {
    return (
      <div class="esv-favorites-state" role="status">
        <p>Carregando sua seleção…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div class="esv-favorites-state">
        <p>Não foi possível carregar seus favoritos agora.</p>
        <button type="button" onClick={() => void load(readIDs())}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div class="esv-favorites-empty">
        <p class="esv-kicker">SUA SELEÇÃO</p>
        <h2>Nenhuma peça salva ainda.</h2>
        <p>
          Use o coração nas peças que chamarem sua atenção. Elas aparecerão
          aqui para você consultar quando quiser.
        </p>
        <a href="/colecao">Explorar a coleção</a>
      </div>
    );
  }

  return (
    <>
      <div class="esv-favorites-toolbar">
        <p>
          <strong>{ids.length}</strong>{" "}
          {ids.length === 1 ? "peça salva" : "peças salvas"}
        </p>
        <p>Sua seleção também fica vinculada ao atendimento Esméra.</p>
      </div>

      {feedback && (
        <p class="esv-favorites-feedback" role="alert">{feedback}</p>
      )}

      <div class="esv-favorites-grid">
        {orderedItems.map((product) => (
          <article class="esv-favorite-item" key={product.id}>
            <a
              class="esv-favorite-media"
              href={`/produto/${product.slug}`}
              aria-label={`Ver ${product.title}`}
            >
              <img
                src={product.image}
                alt={product.alt}
                width="1200"
                height="800"
                loading="lazy"
                decoding="async"
              />
            </a>

            <div class="esv-favorite-copy">
              <div>
                <p class="esv-favorite-meta">
                  {[product.category, product.material].filter(Boolean).join(" · ")}
                </p>
                <h2>
                  <a href={`/produto/${product.slug}`}>{product.title}</a>
                </h2>
                <p class="esv-favorite-availability">
                  {availabilityLabel(product.availability)}
                </p>
              </div>

              <div class="esv-favorite-value">
                {product.isInquiry
                  ? <span>Sob consulta</span>
                  : <strong>{product.formattedPrice}</strong>}
              </div>

              <div class="esv-favorite-actions">
                <a href={`/produto/${product.slug}`}>Ver detalhes</a>
                {!product.isInquiry && product.availability !== "archive" && (
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                  >
                    Adicionar ao carrinho
                  </button>
                )}
                <button
                  class="esv-favorite-remove"
                  type="button"
                  disabled={busyId === product.id}
                  onClick={() => void remove(product)}
                >
                  {busyId === product.id ? "Removendo…" : "Remover"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
