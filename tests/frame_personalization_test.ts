import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import type { EsmeraObject, EsmeraVariant } from "../lib/payload/types.ts";
import {
  coerceFramePersonalization,
  createFramePersonalization,
  FRAME_PHRASES_LARGE,
  FRAME_PHRASES_SMALL,
  framePersonalizationKey,
  framePhraseOptions,
  frameSizeVariants,
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

Deno.test("identifica produtos de quadro/quadrinho sem afetar o restante do catálogo", () => {
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

Deno.test("resolve tamanho e repertório 10x10 vs 15x15/20x20", () => {
  const item = product();
  assertEquals(inferFrameSize(item, variant("10 x 10 cm")), "10x10");
  assertEquals(framePhraseOptions("10x10"), FRAME_PHRASES_SMALL);
  assertEquals(framePhraseOptions("15x15"), FRAME_PHRASES_LARGE);
  assertEquals(framePhraseOptions("20x20"), FRAME_PHRASES_LARGE);
  assertEquals(maxFrameTextLength("10x10"), 25);
  assertEquals(maxFrameTextLength("20x20"), 120);
});

Deno.test("mapeia variantes de tamanho para os chips do seletor", () => {
  const item = product({
    variants: [variant("10x10"), variant("15 x 15 cm"), variant("20 × 20")],
  });
  assertEquals(
    frameSizeVariants(item).map((entry) => entry.size),
    ["10x10", "15x15", "20x20"],
  );
});

Deno.test("personalização exige tamanho, acabamento e texto", () => {
  const value = createFramePersonalization(product());
  assertStringIncludes(validateFramePersonalization(value) ?? "", "tamanho");
  value.size = "20x20";
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

Deno.test("identifica a dimensão real dos quadros cadastrados no CMS", () => {
  const frame10 = product({
    id: "711",
    title: "Caixa-quadro em Acrílico",
    slug: "colecao-fe-quadro-10-x-10-cm",
    subtitle: "Coleção Fé",
    category: "Caixas em Acrílico",
  });
  const frame15 = product({
    id: "710",
    title: "Caixa-quadro em Acrílico ",
    slug: "colecao-fe-quadro-15-x-15-cm",
    subtitle: "Coleção Fé",
    category: "Caixas em Acrílico",
  });
  assert(isFramePersonalizationProduct(frame10));
  assert(isFramePersonalizationProduct(frame15));
  const small = createFramePersonalization(frame10);
  const large = createFramePersonalization(frame15);
  assertEquals(small.size, "10x10");
  assertEquals(large.size, "15x15");
  assertEquals(framePhraseOptions(small.size), FRAME_PHRASES_SMALL);
  assertEquals(framePhraseOptions(large.size), FRAME_PHRASES_LARGE);
  assertEquals(frameSizeVariants(frame10), []);
  assertEquals(frameSizeVariants(frame15), []);
});

Deno.test("20x20 e variantes com tamanhos explícitos preservam a prioridade", () => {
  assertEquals(
    inferFrameSize(product({ slug: "colecao-fe-quadro-20-x-20-cm" })),
    "20x20",
  );
  assertEquals(
    inferFrameSize(
      product({ slug: "colecao-fe-quadro-10-x-10-cm" }),
      variant("20 × 20 cm"),
    ),
    "20x20",
  );
  assertEquals(
    frameSizeVariants(product({
      slug: "colecao-fe-quadro-10-x-10-cm",
      variants: [variant("Dourado"), variant("Prata")],
    })),
    [],
  );
  assertEquals(framePhraseOptions(null), []);
});

Deno.test("as opções permitidas nunca misturam quadros de 10cm e 15/20cm", () => {
  assertEquals(FRAME_PHRASES_SMALL.length, 13);
  assertEquals(FRAME_PHRASES_LARGE.length, 14);
  for (const phrase of FRAME_PHRASES_SMALL) {
    assert(framePhraseOptions("10x10").includes(phrase));
    assert(!framePhraseOptions("15x15").includes(phrase));
    assert(!framePhraseOptions("20x20").includes(phrase));
  }
  for (const phrase of FRAME_PHRASES_LARGE) {
    assert(!framePhraseOptions("10x10").includes(phrase));
    assert(framePhraseOptions("15x15").includes(phrase));
    assert(framePhraseOptions("20x20").includes(phrase));
  }
});

Deno.test("recusa texto longo de preset 15/20cm em produto real 10x10", () => {
  const frame10 = product({ slug: "colecao-fe-quadro-10-x-10-cm" });
  const value = createFramePersonalization(frame10);
  value.finish = "gold";
  value.text = FRAME_PHRASES_LARGE[0];
  assertEquals(value.size, "10x10");
  assertStringIncludes(
    validateFramePersonalization(value) ?? "",
    "no máximo",
  );
  value.text = "Alma leve";
  assertEquals(validateFramePersonalization(value), null);
  assertEquals(
    coerceFramePersonalization({
      ...value,
      text: "Há beleza em tudo aquilo",
    }),
    undefined,
  );
  assertEquals(coerceFramePersonalization(value), value);
});

Deno.test("trocar de 10cm para 15/20cm limpa preset incompatível", () => {
  const frame = product({ slug: "colecao-fe-quadro-10-x-10-cm" });
  const value = createFramePersonalization(frame);
  value.finish = "silver";
  value.text = "Alma leve";
  const to15 = reconcileFramePersonalization(frame, variant("15x15"), value);
  assertEquals(to15.size, "15x15");
  assertEquals(to15.text, "");
  const to20 = reconcileFramePersonalization(frame, variant("20x20"), value);
  assertEquals(to20.size, "20x20");
  assertEquals(to20.text, "");
});

Deno.test("prata e dourada aceitas com preset 10x10 ou frases 15x15/20x20", () => {
  for (const finish of ["silver", "gold"] as const) {
    for (const size of ["10x10", "15x15", "20x20"] as const) {
      const value = createFramePersonalization(
        product({ slug: `colecao-fe-quadro-${size.replace("x", "-x-")}-cm` }),
      );
      value.finish = finish;
      value.text = framePhraseOptions(size)[0];
      assertEquals(value.size, size);
      assertEquals(validateFramePersonalization(value), null);
    }
  }
});
