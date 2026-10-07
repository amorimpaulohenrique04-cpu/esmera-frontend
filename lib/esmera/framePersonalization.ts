import type { EsmeraObject, EsmeraVariant } from "../payload/types.ts";

export type FrameSize = "10x10" | "15x15" | "20x20";
export type FrameFinish = "silver" | "gold";
export type FrameTextMode = "preset" | "custom";

export interface FramePersonalization {
  kind: "frame_text";
  size: FrameSize | null;
  finish: FrameFinish | null;
  mode: FrameTextMode;
  text: string;
}

export const FRAME_PHRASES_LARGE = [
  "“Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens\". Colossenses 3:23",
  "“A água rompe a rocha não pela força mas pela constância”. Hebreus 10:36",
  "Há beleza em tudo aquilo que floresce no seu próprio tempo",
  "A gente leva da vida, a vida que a gente leva",
  "Que nunca nos falte coragem para recomeçar e delicadeza para continuar",
  "A vida fica mais bonita quando a gente aprende a apreciar o caminho",
  "“Confiem para sempre no senhor pois o senhor, somente o senhor é rocha eterna”. Isaías 26:4",
  "Abençoada seja a mulher que teme ao Senhor e guia seus filhos no caminho da verdade",
  "Sobre a Rocha minha casa estará para sempre",
  "“O seu valor em muito ultrapassa o de finas joias” Provérbios 31:10",
  "Que haja Rocha sob os seus pés e tesouro no seu coração",
  "“O justo anda na sua integridade; felizes são os seus filhos depois dele.” Provérbios 20:7",
  "“Acima de todas as coisas guarde o seu coração, pois ele dirige o rumo da sua vida”. Provérbios 4:23",
] as const;

export const FRAME_PHRASES_SMALL = [
  "Alma leve",
  "Viver o agora",
  "Leveza",
  "Plenitude",
  "Florescer",
  "Realizar",
  "Celebrar",
  "Propósito",
  "Prosperar",
  "Transbordar",
  "Construir",
  "Sonhar",
  "Conquistar",
] as const;

function fold(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function searchableProductText(product: EsmeraObject): string {
  return [
    product.title,
    product.subtitle,
    product.category,
    product.material,
    ...(product.searchTerms ?? []),
    ...(product.attributes ?? []).flatMap((item) => [item.label, item.value]),
    ...(product.variants ?? []).map((variant) => variant.label),
  ].map(fold).filter(Boolean).join(" ");
}

export function isFramePersonalizationProduct(product: EsmeraObject): boolean {
  const text = searchableProductText(product);
  return /\bquadro(s)?\b|\bquadrinho(s)?\b/.test(text);
}

export function inferFrameSize(
  product: EsmeraObject,
  variant?: EsmeraVariant,
): FrameSize | null {
  const values = [
    variant?.label,
    product.title,
    product.subtitle,
    product.category,
    ...(product.attributes ?? []).flatMap((item) => [item.label, item.value]),
  ].map((value) => fold(value).replaceAll("×", "x"));

  for (const value of values) {
    if (/\b10\s*x\s*10\b/.test(value)) return "10x10";
    if (/\b15\s*x\s*15\b/.test(value)) return "15x15";
    if (/\b20\s*x\s*20\b/.test(value)) return "20x20";
  }
  return null;
}

export function framePhraseOptions(size: FrameSize | null): readonly string[] {
  return size === "10x10" ? FRAME_PHRASES_SMALL : FRAME_PHRASES_LARGE;
}

export function maxFrameTextLength(size: FrameSize | null): number {
  return size === "10x10" ? 25 : 120;
}

export function createFramePersonalization(
  product: EsmeraObject,
  variant?: EsmeraVariant,
): FramePersonalization {
  return {
    kind: "frame_text",
    size: inferFrameSize(product, variant),
    finish: null,
    mode: "preset",
    text: "",
  };
}

export function reconcileFramePersonalization(
  product: EsmeraObject,
  variant: EsmeraVariant | undefined,
  current: FramePersonalization,
): FramePersonalization {
  const size = inferFrameSize(product, variant);
  const maxLength = maxFrameTextLength(size);
  if (current.mode === "custom") {
    return { ...current, size, text: current.text.slice(0, maxLength) };
  }
  const options = framePhraseOptions(size);
  return {
    ...current,
    size,
    text: options.includes(current.text as never) ? current.text : "",
  };
}

export function validateFramePersonalization(
  value: FramePersonalization | null | undefined,
): string | null {
  if (!value) return "Escolha a personalização do quadrinho.";
  if (!value.finish) return "Escolha o acabamento da frase: prata ou dourada.";
  const text = value.text.trim();
  if (!text) {
    return value.mode === "custom"
      ? "Digite a frase que deseja no quadrinho."
      : "Escolha uma frase para o quadrinho.";
  }
  if (text.length > maxFrameTextLength(value.size)) {
    return `A frase pode ter no máximo ${maxFrameTextLength(value.size)} caracteres.`;
  }
  if (value.mode === "preset" && !framePhraseOptions(value.size).includes(text as never)) {
    return "Escolha uma das frases disponíveis para este tamanho.";
  }
  return null;
}

export function frameFinishLabel(value: FrameFinish | null): string {
  if (value === "silver") return "Prata";
  if (value === "gold") return "Dourada";
  return "";
}

export function frameSizeLabel(value: FrameSize | null): string {
  return value ? value.replace("x", " × ") + " cm" : "Tamanho do produto";
}

export function framePersonalizationKey(
  value: FramePersonalization | null | undefined,
): string {
  if (!value) return "standard";
  return [value.size ?? "auto", value.finish ?? "unset", value.mode, value.text.trim()]
    .join(":");
}

export function coerceFramePersonalization(
  value: unknown,
): FramePersonalization | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const data = value as Partial<FramePersonalization>;
  if (data.kind !== "frame_text") return undefined;
  const size = data.size === "10x10" || data.size === "15x15" || data.size === "20x20"
    ? data.size
    : null;
  const finish = data.finish === "silver" || data.finish === "gold"
    ? data.finish
    : null;
  const mode = data.mode === "custom" ? "custom" : "preset";
  const text = typeof data.text === "string"
    ? data.text.trim().slice(0, maxFrameTextLength(size))
    : "";
  if (!finish || !text) return undefined;
  return {
    kind: "frame_text",
    size,
    finish,
    mode,
    text,
  };
}
