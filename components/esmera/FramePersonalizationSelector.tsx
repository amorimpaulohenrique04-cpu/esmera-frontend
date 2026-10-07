import type { EsmeraObject, EsmeraVariant } from "../../lib/payload/types.ts";
import {
  type FrameFinish,
  type FramePersonalization,
  frameFinishLabel,
  framePhraseOptions,
  frameSizeLabel,
  maxFrameTextLength,
} from "../../lib/esmera/framePersonalization.ts";

interface Props {
  product: EsmeraObject;
  variant?: EsmeraVariant;
  value: FramePersonalization;
  onChange: (value: FramePersonalization) => void;
  error?: string | null;
}

export default function FramePersonalizationSelector({
  value,
  onChange,
  error,
}: Props) {
  const phrases = framePhraseOptions(value.size);
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
          <p class="esv-kicker">Personalização</p>
          <h3 id="esv-frame-personalization-title">
            Personalize seu quadrinho
          </h3>
        </div>
        <span class="esv-frame-size">{frameSizeLabel(value.size)}</span>
      </div>

      <fieldset class="esv-frame-fieldset">
        <legend>Cor da frase</legend>
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
        <legend>Texto do quadrinho</legend>
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
            Escrever minha frase
          </button>
        </div>

        {value.mode === "preset"
          ? (
            <div
              class="esv-frame-phrase-list"
              role="radiogroup"
              aria-label="Frases disponíveis"
            >
              {phrases.map((phrase) => (
                <button
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
          )
          : (
            <label class="esv-frame-custom">
              <span>Sua frase</span>
              <textarea
                value={value.text}
                maxLength={maxLength}
                rows={value.size === "10x10" ? 2 : 3}
                placeholder={value.size === "10x10"
                  ? "Ex.: Sempre leve"
                  : "Digite a frase que deseja gravar no quadrinho"}
                onInput={(event) => update({ text: event.currentTarget.value })}
              />
              <small>
                {value.text.length}/{maxLength} caracteres
                {value.size === "10x10"
                  ? " · para este tamanho, prefira palavras curtas"
                  : ""}
              </small>
            </label>
          )}
      </fieldset>

      {(value.finish || value.text) && (
        <div class="esv-frame-summary" aria-live="polite">
          <span>Sua escolha</span>
          <div>
            {value.finish && <strong>{frameFinishLabel(value.finish)}</strong>}
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
