import { assertEquals } from "@std/assert";
import {
  buildGiftLine,
  collectGiftLineSources,
  descriptionParagraphs,
  type GiftLineSource,
  isGiftLinePath,
} from "../../lib/esmera/giftLine.ts";
import type {
  StorefrontMediaV2,
  StorefrontProductV2,
} from "../../lib/esmera/storefront.ts";

function media(name: string, width = 2000, height = 1335): StorefrontMediaV2 {
  return {
    id: name,
    url: `/api/media/file/${name}.jpg`,
    alt: name,
    width,
    height,
  };
}

function rich(...paragraphs: string[]) {
  return {
    root: {
      type: "root",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        children: [{ type: "text", text }],
      })),
    },
  };
}

function source(
  title: string,
  cents: number | null,
  paragraphs: string[] = [],
  gallery: StorefrontMediaV2[] = [media(`${title}-1`), media(`${title}-2`)],
): GiftLineSource {
  const item: StorefrontProductV2 = {
    id: title,
    slug: title.toLowerCase().replace(/[^a-z]+/g, "-"),
    title,
    priceUnit: "cent",
    price: cents,
    purchasable: cents !== null,
    image: gallery[0],
    pricing: cents === null
      ? { mode: "inquiry", priceCents: null, installment: null }
      : { mode: "fixed", priceCents: cents, installment: null },
  };
  return { item, detail: { description: rich(...paragraphs), gallery } };
}

const currentLine = (): GiftLineSource[] => [
  source("Luz Serena", 36000, [
    "Vela P com recipiente de vidro e porta-fósforos.",
    "Luz suave e detalhes naturais em uma composição delicada.",
  ]),
  source("Luz Plena", 39000, [
    "Vela M com recipiente de vidro e porta-fósforos",
    "Uma composição acolhedora.",
  ]),
  source("Luz Maior", 42000, [
    "Vela G com recipiente de vidro e porta-fósforos",
    "A presença da pedra natural.",
  ]),
  source("Brisa", 23000, ["Home Spray + Vela PP", "Para perfumar e acolher."], [
    media("br1"),
    media("br2"),
    media("br3"),
  ]),
  source("Palavra de Luz | Grande", 42000, [
    "Base com cúpula – Salmos",
    "Uma peça especial que une fé, beleza e significado.",
  ], [media("pg1"), media("pg2"), media("pg3", 1335, 2000)]),
  source("Palavra de Luz | Pequena", 26000, [
    "Base com cúpula – Salmos",
    "Delicadeza e inspiração bíblica.",
  ], [media("pp1"), media("pp2", 1335, 2000), media("pp3")]),
];

Deno.test("a linha atual vira os três capítulos do layout aprovado", () => {
  const line = buildGiftLine(currentLine());
  assertEquals(line.families.map((family) => [family.name, family.format]), [
    ["Luz", "selector"],
    ["Palavra de Luz", "twins"],
    ["Brisa", "solo"],
  ]);
});

Deno.test("o seletor Luz vai de P a G e abre na maior peça", () => {
  const [luz] = buildGiftLine(currentLine()).families;
  assertEquals(luz.pieces.map((piece) => piece.sizeCode), ["P", "M", "G"]);
  assertEquals(luz.pieces[luz.initialIndex].label, "Luz Maior");
  assertEquals(luz.eyebrow, "Vela com recipiente de vidro e porta-fósforos");
  assertEquals(luz.pieces[2].price, "R$ 420,00");
  assertEquals(luz.pieces[2].phrase, "A presença da pedra natural.");
});

Deno.test("Palavra de Luz usa o tamanho como rótulo e só fotos horizontais", () => {
  const [, palavra] = buildGiftLine(currentLine()).families;
  assertEquals(palavra.pieces.map((piece) => piece.label), [
    "Grande",
    "Pequena",
  ]);
  assertEquals(palavra.eyebrow, "Base com cúpula – Salmos");
  assertEquals(
    palavra.phrase,
    "Uma peça especial que une fé, beleza e significado.",
  );
  assertEquals(palavra.pieces[0].image?.id, "pg2");
  assertEquals(palavra.pieces[1].image?.id, "pp3");
});

Deno.test("peça única usa a última foto horizontal", () => {
  const [, , brisa] = buildGiftLine(currentLine()).families;
  assertEquals(brisa.pieces[0].image?.id, "br3");
  assertEquals(brisa.eyebrow, "Home Spray + Vela PP");
});

Deno.test("produto novo entra na família pelo nome", () => {
  const line = buildGiftLine([
    ...currentLine(),
    source("Luz Aurora", 45000),
    source("Palavra de Luz | Média", 33000),
  ]);
  const [luz, palavra] = line.families;
  assertEquals(luz.pieces.at(-1)?.label, "Luz Aurora");
  assertEquals(palavra.format, "selector");
  assertEquals(palavra.pieces.map((piece) => piece.label), [
    "Pequena",
    "Média",
    "Grande",
  ]);
});

Deno.test("o formato acompanha a quantidade de peças", () => {
  const sized = (count: number) =>
    buildGiftLine(
      Array.from(
        { length: count },
        (_, index) => source(`Flor | ${index}`, 10000 + index),
      ),
    ).families[0].format;
  assertEquals([1, 2, 3, 6, 7].map(sized), [
    "solo",
    "twins",
    "selector",
    "selector",
    "grid",
  ]);
});

Deno.test("peças únicas seguidas alternam o lado da foto", () => {
  const { families } = buildGiftLine([
    source("Alfa", 100),
    source("Beta", 200),
    source("Gama", 300),
  ]);
  assertEquals(families.map((family) => family.mirrored), [false, true, false]);
});

Deno.test("família nova vem depois das já diagramadas", () => {
  const { families } = buildGiftLine([
    source("Orvalho", 9000),
    ...currentLine(),
  ]);
  assertEquals(families.at(-1)?.name, "Orvalho");
});

Deno.test("peça sob consulta fica sem preço e sem compra", () => {
  const line = buildGiftLine([
    source("Alfa", null),
    source("Beta", 50000),
  ]);
  const inquiry = line.families.find((family) => family.name === "Alfa");
  assertEquals(inquiry?.pieces[0].price, null);
  assertEquals(inquiry?.pieces[0].isPurchasable, false);
});

Deno.test("sem foto horizontal, usa a foto principal", () => {
  const vertical = media("v", 1335, 2000);
  const line = buildGiftLine([source("Alfa", 100, [], [vertical])]);
  assertEquals(line.families[0].pieces[0].image?.id, "v");
});

Deno.test("sem detalhe, a peça usa os dados da listagem", async () => {
  const base = source("Alfa", 100).item;
  const collected = await collectGiftLineSources(
    { items: [base], pagination: { hasNextPage: false } },
    () => Promise.reject(new Error("não deveria paginar")),
    () => Promise.reject(new Error("falhou")),
  );
  const piece = buildGiftLine(collected).families[0].pieces[0];
  assertEquals(piece.composition, null);
  assertEquals(piece.image?.id, base.image?.id);
});

Deno.test("reúne todas as páginas da categoria", async () => {
  const page = (name: string, hasNextPage: boolean) => ({
    items: [source(name, 100).item],
    pagination: { hasNextPage },
  });
  const collected = await collectGiftLineSources(
    page("Alfa", true),
    (number) => Promise.resolve(page(`Pagina ${number}`, number < 3)),
    () => Promise.resolve({}),
  );
  assertEquals(collected.length, 3);
});

Deno.test("descrição vira parágrafos sem o ponto final", () => {
  assertEquals(descriptionParagraphs(rich("Um texto.", "Outro")), [
    "Um texto",
    "Outro",
  ]);
  assertEquals(descriptionParagraphs(null), []);
});

Deno.test("a página editorial vale só para Presenteáveis", () => {
  assertEquals(isGiftLinePath("/colecao/presenteaveis"), true);
  assertEquals(isGiftLinePath("/colecao/presenteaveis/"), true);
  assertEquals(isGiftLinePath("/colecao/kits"), false);
  assertEquals(isGiftLinePath("/colecao"), false);
  assertEquals(isGiftLinePath("/"), false);
});
