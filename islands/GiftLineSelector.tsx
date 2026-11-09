import { useState } from "preact/hooks";
import {
  GiftBuy,
  GiftPrice,
  GiftShot,
} from "../components/esmera/GiftLineParts.tsx";
import type { GiftFamily } from "../lib/esmera/giftLine.ts";

const STAGE_SIZES = "(max-width: 860px) calc(100vw - 40px), 56vw";

export interface Props {
  family: GiftFamily;
}

/** Família com várias peças: a lista de tamanhos troca foto, texto e compra. */
export default function GiftLineSelector({ family }: Props) {
  const [activeIndex, setActiveIndex] = useState(family.initialIndex);
  const active = family.pieces[activeIndex];
  const hasSizes = family.pieces.some((piece) => piece.sizeCode);

  return (
    <section class="gl-selector" aria-label={family.name}>
      <div class="gl-selector__stage">
        {family.pieces.map((piece, index) => (
          <div
            class={`gl-selector__photo${
              index === activeIndex ? " is-active" : ""
            }`}
            key={piece.id}
            inert={index !== activeIndex}
          >
            <GiftShot piece={piece} sizes={STAGE_SIZES} />
          </div>
        ))}
      </div>

      <div class="gl-selector__panel">
        <div>
          {family.eyebrow && <p class="gl-eyebrow">{family.eyebrow}</p>}
          <h2 class="gl-title">{family.name}</h2>
        </div>

        <div>
          <ul class="gl-rows">
            {family.pieces.map((piece, index) => (
              <li key={piece.id}>
                <button
                  type="button"
                  class={`gl-row${index === activeIndex ? " is-active" : ""}${
                    hasSizes ? "" : " gl-row--plain"
                  }`}
                  aria-pressed={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                >
                  {hasSizes && (
                    <span class="gl-row__size">{piece.sizeCode}</span>
                  )}
                  <span class="gl-row__name">{piece.label}</span>
                  <span class="gl-row__price">
                    <GiftPrice piece={piece} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div class="gl-selector__detail" aria-live="polite">
            {active.phrase && <p class="gl-selector__phrase">{active.phrase}
            </p>}
            {active.installment && <p class="gl-terms">{active.installment}</p>}
            <GiftBuy piece={active} />
          </div>
        </div>
      </div>
    </section>
  );
}
