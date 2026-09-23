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
      "Para projetos especiais, desenvolvemos peças sob encomenda a partir do espaço, das medidas, do uso e da pedra escolhida.\n\nDo desenho à definição do material, acompanhamos cada etapa para criar uma peça pensada para o seu ambiente.",
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
