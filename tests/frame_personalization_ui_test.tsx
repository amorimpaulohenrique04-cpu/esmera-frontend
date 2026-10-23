import {
  assert,
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "@std/assert";
import { render } from "preact-render-to-string";
import FramePersonalizationSelector from "../components/esmera/FramePersonalizationSelector.tsx";
import {
  createFramePersonalization,
  FRAME_PHRASES_LARGE,
  FRAME_PHRASES_SMALL,
} from "../lib/esmera/framePersonalization.ts";
import type { EsmeraObject } from "../lib/payload/types.ts";

function frame(slug: string): EsmeraObject {
  return {
    id: slug,
    slug,
    code: "ESM-FE",
    title: "Caixa-quadro em Acrílico",
    subtitle: "Coleção Fé",
    image: "https://example.com/quadro.jpg",
    alt: "Caixa-quadro",
    category: "Caixas em Acrílico",
    availability: "available",
    gallery: [],
    attributes: [],
    variants: [],
    priceMode: "fixed",
    priceCents: 10000,
    formattedPrice: "R$ 100,00",
    isInquiry: false,
    seo: { title: "", description: "", noindex: false },
  };
}

function html(slug: string): string {
  const product = frame(slug);
  return render(
    <FramePersonalizationSelector
      product={product}
      value={createFramePersonalization(product)}
      onChange={() => {}}
      onVariantChange={() => {}}
    />,
  );
}

Deno.test("CMS frame 10x10 renders ONLY 13 short phrases, silver/gold", () => {
  const markup = html("colecao-fe-quadro-10-x-10-cm");
  assertStringIncludes(markup, "10 × 10 cm");
  assertStringIncludes(markup, "Prata");
  assertStringIncludes(markup, "Dourada");
  assertStringIncludes(markup, "is-compact");
  assertEquals(markup.match(/role="radio"/g)?.length, 13);
  for (const phrase of FRAME_PHRASES_SMALL) {
    assertStringIncludes(markup, phrase);
  }
  for (const phrase of FRAME_PHRASES_LARGE) {
    assertFalse(markup.includes(phrase));
  }
});

Deno.test("CMS frame 15x15 renders ONLY long phrases", () => {
  const markup = html("colecao-fe-quadro-15-x-15-cm");
  assertStringIncludes(markup, "15 × 15 cm");
  assertEquals(markup.match(/role="radio"/g)?.length, FRAME_PHRASES_LARGE.length);
  assertStringIncludes(markup, "Colossenses 3:23");
  assertStringIncludes(markup, "Provérbios 4:23");
  for (const phrase of FRAME_PHRASES_SMALL) {
    assertFalse(markup.includes(`>${phrase}<`));
  }
});

Deno.test("frame 20x20 uses the long list; unknown sizes show no preset", () => {
  const large = html("colecao-fe-quadro-20-x-20-cm");
  assertStringIncludes(large, "20 × 20 cm");
  assertEquals(large.match(/role="radio"/g)?.length, FRAME_PHRASES_LARGE.length);

  const unknown = html("colecao-fe-quadro-sem-dimensao");
  assertStringIncludes(unknown, "Tamanho não identificado");
  assertEquals(unknown.match(/role="radio"/g)?.length ?? 0, 0);
  assert(!unknown.includes("Colossenses 3:23"));
  assert(!unknown.includes(">Alma leve<"));
});
