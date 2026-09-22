import { assertEquals } from "@std/assert";
import {
  esmeraObjectToCardViewModel,
  resolveCardMediaFit,
  toProductCardViewModel,
} from "../../lib/esmera/productCard.ts";
import type { StorefrontProductV2 } from "../../lib/esmera/storefront.ts";
import type { EsmeraObject } from "../../lib/payload/types.ts";

function product(
  overrides: Partial<StorefrontProductV2> = {},
): StorefrontProductV2 {
  return {
    id: "42",
    slug: "ponta-de-esmeralda",
    title: "Gelato",
    priceUnit: "cent",
    price: 49000,
    image: {
      id: "1",
      url: "/pc.jpg",
      alt: "Ponta de Esmeralda",
      width: 900,
      height: 1200,
    },
    identity: {
      name: "Gelato",
      pieceType: "Ponta de Esmeralda",
      material: "Rocha de Esmeralda Natural",
    },
    pieceType: "Ponta de Esmeralda",
    material: "Rocha de Esmeralda Natural",
    state: "available",
    isUnique: true,
    purchasable: true,
    specs: { heightMm: 180, widthMm: null, depthMm: null, weightGrams: 1200 },
    pricing: {
      mode: "fixed",
      priceCents: 49000,
      installment: { count: 12, amountCents: 4083, interestFree: true },
    },
    ...overrides,
  };
}

Deno.test("reproduz o card do mockup", () => {
  const vm = toProductCardViewModel(product());
  assertEquals(vm.eyebrow, "PONTA DE ESMERALDA");
  assertEquals(vm.title, "Gelato");
  assertEquals(vm.status, "PEÇA ÚNICA · DISPONÍVEL");
  assertEquals(vm.specs, "18 cm · 1,2 kg");
  assertEquals(vm.price, "R$ 490,00");
  assertEquals(vm.installment, {
    prefix: "ou ",
    emphasis: "12x de R$ 40,83",
    suffix: " sem juros",
  });
  assertEquals(vm.image, "/pc.jpg");
  assertEquals(vm.mediaFit, "cover");
  assertEquals(vm.isPurchasable, true);
});

Deno.test("bandejas e bandejinhas preservam a composição inteira", () => {
  assertEquals(
    resolveCardMediaFit("Bandeja Grande em Bege Bahia", "Bandejas para Lavabo"),
    "contain",
  );
  assertEquals(
    resolveCardMediaFit("Bandejinha para Lavabo em Jadeíta", null),
    "contain",
  );
  assertEquals(
    resolveCardMediaFit("Porta-sabonete Líquido em Bege Bahia", "Porta-sabonete"),
    "cover",
  );

  const vm = toProductCardViewModel(
    product({
      title: "Bandejinha para Lavabo em Jadeíta",
      identity: {
        name: "Bandejinha para Lavabo em Jadeíta",
        pieceType: "Bandejas para Lavabo",
        material: "Jadeíta",
      },
      pieceType: "Bandejas para Lavabo",
    }),
  );
  assertEquals(vm.mediaFit, "contain");
});

Deno.test("título é sempre o nome, mesmo quando há pieceType", () => {
  const vm = toProductCardViewModel(
    product({
      pieceType: null,
      identity: { name: "Gelato", pieceType: null, material: "X" },
    }),
  );
  assertEquals(vm.title, "Gelato");
});

Deno.test("sem tipo de peça, eyebrow mostra o material", () => {
  const vm = toProductCardViewModel(
    product({
      pieceType: null,
      identity: {
        name: "Bandeja Grande Bege Bahia",
        pieceType: null,
        material: "Bege Bahia Natural",
      },
    }),
  );
  assertEquals(vm.title, "Bandeja Grande Bege Bahia");
  assertEquals(vm.eyebrow, "BEGE BAHIA NATURAL");
  assertEquals(vm.mediaFit, "contain");
});

Deno.test("sem peso mostra apenas a dimensão", () => {
  const vm = toProductCardViewModel(
    product({
      specs: { heightMm: 180, widthMm: null, depthMm: null, weightGrams: null },
    }),
  );
  assertEquals(vm.specs, "18 cm");
});

Deno.test("sem dimensão nem peso, specs é nulo", () => {
  const vm = toProductCardViewModel(
    product({
      specs: {
        heightMm: null,
        widthMm: null,
        depthMm: null,
        weightGrams: null,
      },
    }),
  );
  assertEquals(vm.specs, null);
});

Deno.test("preço sob consulta esconde preço e parcelamento", () => {
  const vm = toProductCardViewModel(
    product({
      purchasable: false,
      pricing: { mode: "inquiry", priceCents: null, installment: null },
    }),
  );
  assertEquals(vm.price, null);
  assertEquals(vm.installment, null);
  assertEquals(vm.isPurchasable, false);
});

Deno.test("sob encomenda não repete PEÇA ÚNICA quando não é única", () => {
  const vm = toProductCardViewModel(
    product({ state: "made_to_order", isUnique: false }),
  );
  assertEquals(vm.status, "SOB ENCOMENDA");
});

Deno.test("parcelamento com juros omite 'sem juros'", () => {
  const vm = toProductCardViewModel(
    product({
      pricing: {
        mode: "fixed",
        priceCents: 49000,
        installment: { count: 12, amountCents: 4083, interestFree: false },
      },
    }),
  );
  assertEquals(vm.installment?.suffix, "");
});

Deno.test("altura fracionária e peso abaixo de 1 kg", () => {
  const vm = toProductCardViewModel(
    product({
      specs: { heightMm: 185, widthMm: null, depthMm: null, weightGrams: 800 },
    }),
  );
  assertEquals(vm.specs, "18,5 cm · 800 g");
});

function esmera(overrides: Partial<EsmeraObject> = {}): EsmeraObject {
  return {
    id: "42",
    slug: "gelato",
    code: "OBJ-021",
    title: "Gelato",
    image: "/cover.jpg",
    alt: "Ponta de Esmeralda",
    availability: "unique",
    material: "Rocha de Esmeralda Natural",
    category: "Ponta de Esmeralda",
    edition: "Peça única",
    attributes: [
      { label: "Altura", value: "18 cm" },
      { label: "Peso", value: "1,2 kg" },
    ],
    gallery: [],
    priceMode: "fixed",
    priceCents: 49000,
    formattedPrice: "R$ 490,00",
    isInquiry: false,
    variants: [],
    seo: {} as EsmeraObject["seo"],
    price: "R$ 490,00",
    ...overrides,
  };
}

Deno.test("bridge EsmeraObject → ViewModel usa categoria, nome e parcelamento", () => {
  const vm = esmeraObjectToCardViewModel(esmera());
  assertEquals(vm.title, "Gelato");
  assertEquals(vm.eyebrow, "PONTA DE ESMERALDA");
  assertEquals(vm.status, "PEÇA ÚNICA · DISPONÍVEL");
  assertEquals(vm.specs, "18 cm · 1,2 kg");
  assertEquals(vm.price, "R$ 490,00");
  assertEquals(vm.installment, {
    prefix: "ou ",
    emphasis: "12x de R$ 40,83",
    suffix: " sem juros",
  });
  assertEquals(vm.mediaFit, "cover");
  assertEquals(vm.isPurchasable, true);
});

Deno.test("bridge legado também detecta bandejinhas", () => {
  const vm = esmeraObjectToCardViewModel(
    esmera({
      title: "Bandejinha para Lavabo em Jadeíta",
      category: "Bandejas para Lavabo",
    }),
  );
  assertEquals(vm.mediaFit, "contain");
});

Deno.test("Storefront e EsmeraObject geram a mesma identidade visual", () => {
  const storefront = toProductCardViewModel(product());
  const legacy = esmeraObjectToCardViewModel(esmera());
  assertEquals(
    {
      eyebrow: legacy.eyebrow,
      title: legacy.title,
      status: legacy.status,
      specs: legacy.specs,
      price: legacy.price,
      installment: legacy.installment,
      mediaFit: legacy.mediaFit,
    },
    {
      eyebrow: storefront.eyebrow,
      title: storefront.title,
      status: storefront.status,
      specs: storefront.specs,
      price: storefront.price,
      installment: storefront.installment,
      mediaFit: storefront.mediaFit,
    },
  );
});

Deno.test("bridge: sob consulta não é comprável e esconde preço", () => {
  const vm = esmeraObjectToCardViewModel(
    esmera({
      isInquiry: true,
      priceMode: "inquiry",
      priceCents: null,
      price: undefined,
    }),
  );
  assertEquals(vm.price, null);
  assertEquals(vm.isPurchasable, false);
});
