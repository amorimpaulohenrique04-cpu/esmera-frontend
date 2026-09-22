import Arrow from "../../components/esmera/Arrow.tsx";
import {
  loadResolvedHome,
  type ResolvedHome,
} from "../../lib/esmera/homeData.ts";

export interface Props {
  eyebrow?: string;
  title?: string;
  /** @format textarea */
  text?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export const loader = async (props: Props) => ({
  ...props,
  resolvedHome: await loadResolvedHome(),
});

export default function PrivateInvitation(
  props: Props & { resolvedHome?: ResolvedHome },
) {
  if (props.resolvedHome?.privateInvitation === null) return null;
  const source = props.resolvedHome?.privateInvitation ?? props;
  const {
    eyebrow = "08 — Atendimento Exclusivo",
    title = "Uma peça pode começar com uma ideia.",
    text =
      "Para projetos especiais, desenvolvemos criações sob encomenda a partir da necessidade, do espaço e da matéria.\n\nDo desenho à escolha da pedra, cada detalhe pode ser pensado para criar uma peça que tenha sentido naquele lugar.",
    ctaLabel = "Converse com a Esméra sobre seu projeto.",
    ctaHref = "",
  } = source;
  if (!ctaHref) return null;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section
      id="private"
      class="esv-private"
      aria-labelledby="esv-private-title"
    >
      <div class="esv-shell esv-private-grid">
        <p
          class="esv-kicker esv-kicker-light"
          data-motion="reveal"
          data-motion-order="0"
        >
          {eyebrow}
        </p>
        <div
          class="esv-private-copy"
          data-motion="reveal"
          data-motion-order="1"
        >
          <h2 id="esv-private-title">{title}</h2>
          {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {ctaLabel && (
            <a class="esv-private-cta" href={ctaHref}>
              {ctaLabel} <Arrow size={14} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
