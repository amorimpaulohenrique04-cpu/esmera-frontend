import {
  type FrameFinish,
  type FramePersonalization,
  frameFinishLabel,
  framePhraseOptions,
  frameSizeLabel,
  frameSizeVariants,
  maxFrameTextLength,
} from "../../lib/esmera/framePersonalization.ts";
import type { EsmeraObject, EsmeraVariant } from "../../lib/payload/types.ts";

interface Props {
  product: EsmeraObject;
  variant?: EsmeraVariant;
  value: FramePersonalization;
  onChange: (value: FramePersonalization) => void;
  onVariantChange: (variant: EsmeraVariant | undefined) => void;
  error?: string | null;
}

export default function FramePersonalizationSelector({
  product,
  variant,
  value,
  onChange,
  onVariantChange,
  error,
}: Props) {
  const phrases = framePhraseOptions(value.size);
  const sizeVariants = frameSizeVariants(product);
  const maxLength = maxFrameTextLength(value.size);
  const update = (patch: Partial<FramePersonalization>) =>
    onChange({ ...value, ...patch });

  const selectFinish = (finish: FrameFinish) => update({ finish });
  const selectMode = (mode: FramePersonalization["mode"]) => {
    update({ mode, text: "" });
  };

  return (
    <section
      class="esv-frame-personalization"
      aria-labelledby="esv-frame-personalization-title"
    >
      <div class="esv-frame-personalization-head">
        <div>
          <p class="esv-kicker">Feito para você</p>
          <h3 id="esv-frame-personalization-title">
            Personalize seu quadrinho
          </h3>
        </div>
        {sizeVariants.length === 0 && (
          <span class="esv-frame-size">{frameSizeLabel(value.size)}</span>
        )}
      </div>

      <fieldset class="esv-frame-fieldset">
        <legend>1. Tamanho</legend>
        {sizeVariants.length > 0
          ? (
            <div class="esv-frame-size-grid">
              {sizeVariants.map((option) => (
                <button
                  type="button"
                  class={`esv-frame-size-chip${
                    variant?.sku === option.variant.sku ? " is-selected" : ""
                  }`}
                  aria-pressed={variant?.sku === option.variant.sku}
                  onClick={() => onVariantChange(option.variant)}
                >
                  {frameSizeLabel(option.size)}
                </button>
              ))}
            </div>
          )
          : (
            <div class="esv-frame-fixed-size">
              {value.size
                ? frameSizeLabel(value.size)
                : "Tamanho não identificado no cadastro do produto"}
            </div>
          )}
      </fieldset>

      <fieldset class="esv-frame-fieldset">
        <legend>2. Cor da frase</legend>
        <div class="esv-frame-finish-grid">
          {(["silver", "gold"] as const).map((finish) => (
            <button
              type="button"
              class={`esv-frame-chip${value.finish === finish ? " is-selected" : ""}`}
              aria-pressed={value.finish === finish}
              onClick={() => selectFinish(finish)}
            >
              <span
                class={`esv-frame-finish-dot is-${finish}`}
                aria-hidden="true"
              />
              {frameFinishLabel(finish)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset class="esv-frame-fieldset">
        <legend>3. Texto do quadrinho</legend>
        <div class="esv-frame-mode-switch" role="group" aria-label="Tipo de texto">
          <button
            type="button"
            class={value.mode === "preset" ? "is-selected" : ""}
            aria-pressed={value.mode === "preset"}
            onClick={() => selectMode("preset")}
          >
            Frases prontas
          </button>
          <button
            type="button"
            class={value.mode === "custom" ? "is-selected" : ""}
            aria-pressed={value.mode === "custom"}
            onClick={() => selectMode("custom")}
          >
            Escrever a minha
          </button>
        </div>

        {value.mode === "preset"
          ? (
            <>
              {value.size === "10x10" && (
                <p class="esv-frame-hint">
                  Para este tamanho, indicamos palavras curtas.
                </p>
              )}
              <div
                class={`esv-frame-phrase-list${
                  value.size === "10x10" ? " is-compact" : ""
                }`}
                role="radiogroup"
                aria-label="Frases disponíveis"
              >
                {phrases.map((phrase, index) => (
                  <button
                    key={`${index}:${phrase}`}
                    type="button"
                    role="radio"
                    aria-checked={value.text === phrase}
                    class={`esv-frame-phrase${value.text === phrase ? " is-selected" : ""}`}
                    onClick={() => update({ text: phrase })}
                  >
                    <span class="esv-frame-radio" aria-hidden="true" />
                    <span>{phrase}</span>
                  </button>
                ))}
              </div>
            </>
          )
          : (
            <label class="esv-frame-custom">
              <span>Sua frase</span>
              <textarea
                value={value.text}
                maxLength={maxLength}
                rows={value.size === "10x10" ? 2 : 4}
                placeholder={value.size === "10x10"
                  ? "Ex.: Fé e leveza"
                  : "Escreva sua frase personalizada"}
                onInput={(event) => update({ text: event.currentTarget.value })}
              />
              <small>
                {value.text.length}/{maxLength} caracteres
                {value.size === "10x10"
                  ? " · recomendamos palavras ou frases bem pequenas"
                  : " · aplicaremos no estilo do quadrinho"}
              </small>
            </label>
          )}
      </fieldset>

      {(value.size || value.finish || value.text) && (
        <div class="esv-frame-summary" aria-live="polite">
          <span>4. Sua escolha</span>
          <div>
            <strong>
              {[frameSizeLabel(value.size), frameFinishLabel(value.finish)]
                .filter(Boolean)
                .join(" · ")}
            </strong>
            {value.text && <p>“{value.text}”</p>}
          </div>
        </div>
      )}

      {error && (
        <p class="esv-frame-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
