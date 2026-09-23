import { useState } from "preact/hooks";

export interface Props {
  productTitle: string;
}

type ShareNavigator = Navigator & {
  share?: (
    data: { title?: string; text?: string; url?: string },
  ) => Promise<void>;
};

export default function ShareProductLink({ productTitle }: Props) {
  const [label, setLabel] = useState("Compartilhar");

  const resetLabel = () => {
    globalThis.setTimeout(() => setLabel("Compartilhar"), 1800);
  };

  const copyLink = async (url: string) => {
    const nav = globalThis.navigator as ShareNavigator;

    if (nav.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const onShare = async () => {
    const url = globalThis.location.href;
    const nav = globalThis.navigator as ShareNavigator;

    if (nav.share) {
      try {
        await nav.share({
          title: productTitle,
          text: `Conheça ${productTitle} — Esméra`,
          url,
        });
        setLabel("Compartilhado");
        resetLabel();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await copyLink(url);
      setLabel("Link copiado");
    } catch {
      setLabel("Copie o link da página");
    }
    resetLabel();
  };

  return (
    <button
      type="button"
      class="esv-text-link"
      style={{ marginTop: "12px" }}
      onClick={onShare}
      aria-label={`Compartilhar ${productTitle}`}
    >
      {label}
    </button>
  );
}
