import { ImageWidget } from "apps/admin/widgets.ts";
import { EsmeraImage } from "../../../components/esmera/ResponsiveMedia.tsx";

export interface ProcessStep {
  /** @description Número de exibição da etapa, ex.: "01" */
  number?: string;
  /** @description Título da etapa, ex.: "Origem" */
  title?: string;
  /** @description Texto descritivo da etapa */
  text?: string;
  /** @description Imagem da etapa */
  image?: ImageWidget;
  /** @description Texto alternativo da imagem */
  imageAlt?: string;
}

export interface Props {
  /** @description Rótulo curto central, ex.: "NOSSO PROCESSO" */
  eyebrow?: string;
  /** @description Título da seção */
  title?: string;
  /** @description Descrição da seção */
  text?: string;
  /** @description Etapas do processo (até 3 exibidas lado a lado) */
  steps?: ProcessStep[];
}

export default function AboutProcess({
  eyebrow = "NOSSO PROCESSO",
  title = "",
  text = "",
  steps = [],
}: Props) {
  const visibleSteps = steps.slice(0, 3);
  if (!title && !text && visibleSteps.length === 0) return null;

  return (
    <section
      class="esv-about-process"
      aria-labelledby="esv-about-process-title"
    >
      <div class="esv-shell esv-about-process-head">
        {eyebrow && (
          <p class="esv-kicker" data-motion="reveal" data-motion-order="0">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2
            id="esv-about-process-title"
            data-motion="reveal"
            data-motion-order="1"
          >
            {title}
          </h2>
        )}
        {text && <p data-motion="reveal" data-motion-order="2">{text}</p>}
      </div>
      {visibleSteps.length > 0 && (
        <div class="esv-shell esv-about-process-steps">
          {visibleSteps.map((step, index) => (
            <article
              class="esv-about-process-step"
              key={`${step.title}-${index}`}
            >
              <span
                class="esv-about-process-step-number"
                data-motion="reveal"
                data-motion-order="0"
              >
                {step.number || String(index + 1).padStart(2, "0")}
              </span>
              {step.title && (
                <h3 data-motion="reveal" data-motion-order="1">{step.title}</h3>
              )}
              {step.text && (
                <p data-motion="reveal" data-motion-order="2">{step.text}</p>
              )}
              {step.image && (
                <figure
                  class="esv-about-process-step-media"
                  data-motion="media-reveal"
                >
                  <EsmeraImage
                    src={step.image}
                    alt={step.imageAlt ?? ""}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={800}
                    sizes="(max-width: 767px) calc(100vw - 64px), (max-width: 1023px) 45vw, 28vw"
                  />
                </figure>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
