import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import type { EsmeraObject, EsmeraVariant } from "../lib/payload/types.ts";
import {
  createFramePersonalization,
  FRAME_PHRASES_LARGE,
  FRAME_PHRASES_SMALL,
  framePersonalizationKey,
  framePhraseOptions,
  inferFrameSize,
  isFramePersonalizationProduct,
  maxFrameTextLength,
  reconcileFramePersonalization,
  validateFramePersonalization,
} from "../lib/esmera/framePersonalization.ts";

function product(overrides: Partial<EsmeraObject> = {}): EsmeraObject {
  return {
    id: "1",
    slug: "quadrinho-em-rocha",
    code: "Q-1",
    title: "Quadrinho em rocha",
    image: "https://example.com/a.jpg",
    alt: "Quadrinho",
    availability: "available",
    category: "Quadrinhos",
    gallery: [],
    attributes: [],
    priceMode: "fixed",
    priceCents: 10000,
    formattedPrice: "R$ 100,00",
    isInquiry: false,
    variants: [],
    seo: { title: "", description: "", noindex: false },
    ...overrides,
  };
}

function variant(label: string): EsmeraVariant {
  return {
    sku: label.replaceAll(" ", "-"),
    label,
    priceMode: "fixed",
    priceCents: 10000,
    formattedPrice: "R$ 100,00",
    isInquiry: false,
    disabled: false,
    mediaKeys: [],
  };
}

Deno.test("identifica somente produtos de quadro/quadrinho como personalizáveis", () => {
  assert(isFramePersonalizationProduct(product()));
  assertEquals(
    isFramePersonalizationProduct(product({
      title: "Descanso de copo",
      slug: "descanso",
      category: "Mesa",
    })),
    false,
  );
});

Deno.test("resolve tamanho pela variante e troca o repertório de frases", () => {
  const item = product();
  assertEquals(inferFrameSize(item, variant("10 x 10 cm")), "10x10");
  assertEquals(framePhraseOptions("10x10"), FRAME_PHRASES_SMALL);
  assertEquals(framePhraseOptions("15x15"), FRAME_PHRASES_LARGE);
  assertEquals(framePhraseOptions("20x20"), FRAME_PHRASES_LARGE);
  assertEquals(maxFrameTextLength("10x10"), 25);
  assertEquals(maxFrameTextLength("20x20"), 120);
});

Deno.test("personalização exige acabamento e texto válidos", () => {
  const value = createFramePersonalization(product(), variant("20x20"));
  assertStringIncludes(validateFramePersonalization(value) ?? "", "acabamento");

  value.finish = "gold";
  assertStringIncludes(validateFramePersonalization(value) ?? "", "frase");

  value.text = FRAME_PHRASES_LARGE[0];
  assertEquals(validateFramePersonalization(value), null);
});

Deno.test("mudança de 20x20 para 10x10 limpa frase incompatível", () => {
  const item = product();
  const value = createFramePersonalization(item, variant("20x20"));
  value.finish = "silver";
  value.text = FRAME_PHRASES_LARGE[0];

  const reconciled = reconcileFramePersonalization(
    item,
    variant("10x10"),
    value,
  );
  assertEquals(reconciled.size, "10x10");
  assertEquals(reconciled.text, "");
});

Deno.test("chave do carrinho separa personalizações diferentes", () => {
  const base = createFramePersonalization(product(), variant("10x10"));
  base.finish = "gold";
  base.text = "Alma leve";
  const other = { ...base, text: "Leveza" };
  assert(framePersonalizationKey(base) !== framePersonalizationKey(other));
});
