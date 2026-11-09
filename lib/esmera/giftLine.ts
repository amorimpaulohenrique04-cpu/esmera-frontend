/**
 * Linha Presenteável: regras da página editorial de /colecao/presenteaveis.
 *
 * Tudo aqui é derivado do cadastro no CMS. Um produto novo na categoria entra
 * sozinho em uma família e recebe o formato adequado à quantidade de peças,
 * sem novo deploy.
 */
import { lexicalToText } from "../payload/richText.ts";
import type { EsmeraObject } from "../payload/types.ts";
import { formatPriceCents, toProductCardViewModel } from "./productCard.ts";
import type { StorefrontMediaV2, StorefrontProductV2 } from "./storefront.ts";

export const GIFT_LINE_SLUG = "presenteaveis";
export const GIFT_LINE_DETAIL_LIMIT = 24;
const GIFT_LINE_MAX_PAGES = 10;

/** Famílias já diagramadas abrem a página, nesta ordem. */
const FAMILY_ORDER = ["luz", "palavra de luz", "brisa"];

export type GiftFamilyFormat = "selector" | "twins" | "solo" | "grid";

export type GiftLineDetail = {
  description?: unknown;
  gallery?: StorefrontMediaV2[];
};

export type GiftLineSource = {
  item: StorefrontProductV2;
  detail?: GiftLineDetail | null;
};

export type GiftPiece = {
  id: string;
  slug: string;
  title: string;
  label: string;
  sizeCode: string | null;
  price: string | null;
  installment: string | null;
  composition: string | null;
  phrase: string | null;
  image: StorefrontMediaV2 | null;
  alternateImage: StorefrontMediaV2 | null;
  isPurchasable: boolean;
  modalProduct: EsmeraObject;
};

export type GiftFamily = {
  key: string;
  name: string;
  format: GiftFamilyFormat;
  mirrored: boolean;
  eyebrow: string | null;
  phrase: string | null;
  initialIndex: number;
  pieces: GiftPiece[];
};

export type GiftLineViewModel = {
  families: GiftFamily[];
};

/** Aceita a rota com ou sem barra final. */
export function isGiftLinePath(pathname: string): boolean {
  return pathname.replace(/\/+$/, "") === `/colecao/${GIFT_LINE_SLUG}`;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .trim();
}

function productName(item: StorefrontProductV2): string {
  return (item.identity?.name ?? item.title).trim();
}

function splitName(name: string): { base: string; variant: string | null } {
  const separator = name.indexOf(" | ");
  if (separator < 0) return { base: name, variant: null };
  return {
    base: name.slice(0, separator).trim(),
    variant: name.slice(separator + 3).trim() || null,
  };
}

function firstWord(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/** Parágrafos do texto rico, na ordem em que foram escritos. */
export function descriptionParagraphs(description: unknown): string[] {
  const root = (description as { root?: { children?: unknown[] } } | null)
    ?.root;
  const children = Array.isArray(root?.children) ? root.children : [];
  return children
    .map((child) =>
      lexicalToText({ root: { children: [child] } }).trim().replace(/\.$/, "")
    )
    .filter(Boolean);
}

function withPeriod(text: string | null): string | null {
  return text ? `${text}.` : null;
}

const SIZE_PATTERN = /\b(vela|tamanho)\s+(PP|GG|P|M|G)\b/i;

function readSizeCode(composition: string | null): string | null {
  return composition?.match(SIZE_PATTERN)?.[2]?.toUpperCase() ?? null;
}

function withoutSize(composition: string): string {
  return composition.replace(SIZE_PATTERN, "$1").replace(/\s{2,}/g, " ");
}

function isLandscape(media: StorefrontMediaV2): boolean {
  const width = media.fullWidth ?? media.width;
  const height = media.fullHeight ?? media.height;
  return !width || !height || width >= height;
}

function formatFor(pieceCount: number): GiftFamilyFormat {
  if (pieceCount === 1) return "solo";
  if (pieceCount === 2) return "twins";
  return pieceCount <= 6 ? "selector" : "grid";
}

/** Foto de destaque e foto alternativa, sempre horizontais quando existirem. */
function choosePhotos(
  source: GiftLineSource,
  format: GiftFamilyFormat,
): Pick<GiftPiece, "image" | "alternateImage"> {
  const gallery = source.detail?.gallery ?? [];
  const landscape = gallery.filter(isLandscape);
  if (landscape.length === 0) {
    const fallback = source.item.image ?? gallery[0] ?? null;
    const hover = source.item.hoverImage;
    return {
      image: fallback,
      alternateImage: hover && isLandscape(hover) ? hover : null,
    };
  }
  const image = format === "solo"
    ? landscape[landscape.length - 1]
    : landscape[1] ?? landscape[0];
  const alternateImage = landscape.find((media) => media.url !== image.url) ??
    null;
  return {
    image,
    alternateImage: format === "selector" ? null : alternateImage,
  };
}

/** Mesmo contrato mínimo que os cards entregam ao modal e ao carrinho. */
function toModalProduct(item: StorefrontProductV2): EsmeraObject {
  return {
    id: item.id,
    slug: item.slug,
    code: item.code ?? "",
    title: productName(item),
    image: item.image?.url ?? "",
    alt: item.image?.alt ?? item.title,
    availability: item.availability === "unique"
      ? "unique"
      : item.state ?? "available",
    category: item.pieceType ?? undefined,
    material: item.material ?? undefined,
    subtitle: item.subtitle ?? undefined,
    detailImage: item.hoverImage?.url ?? undefined,
    gallery: [],
    attributes: [],
    priceMode: item.pricing?.mode ?? "inquiry",
    priceCents: item.pricing?.priceCents ?? item.price ?? null,
    formattedPrice: formatPriceCents(
      item.pricing?.priceCents ?? item.price ?? null,
    ) ?? "",
    isInquiry: item.pricing?.mode !== "fixed",
    variants: [],
    seo: { title: "", description: "", noindex: false },
  };
}

function priceCents(item: StorefrontProductV2): number | null {
  if (item.pricing?.mode === "inquiry") return null;
  const value = item.pricing?.priceCents ?? item.price ?? null;
  return typeof value === "number" && value > 0 ? value : null;
}

function toPiece(
  source: GiftLineSource,
  format: GiftFamilyFormat,
  label: string,
): GiftPiece {
  const { item } = source;
  const card = toProductCardViewModel(item);
  const [composition = null, phrase = null] = descriptionParagraphs(
    source.detail?.description,
  );
  return {
    id: item.id,
    slug: item.slug,
    title: productName(item).replace(" | ", " "),
    label,
    sizeCode: readSizeCode(composition),
    price: card.price,
    installment: card.installment
      ? `${card.installment.prefix}${card.installment.emphasis}${card.installment.suffix}`
      : null,
    composition,
    phrase: withPeriod(phrase),
    ...choosePhotos(source, format),
    isPurchasable: card.isPurchasable,
    modalProduct: toModalProduct(item),
  };
}

function sharedEyebrow(pieces: GiftPiece[]): string | null {
  const compositions = pieces.map((piece) => piece.composition);
  if (compositions.some((composition) => !composition)) return null;
  if (pieces.length === 1) return compositions[0];
  const general = compositions.map((text) => withoutSize(text as string));
  return general.every((text) => normalize(text) === normalize(general[0]))
    ? general[0]
    : null;
}

export function buildGiftLine(sources: GiftLineSource[]): GiftLineViewModel {
  const wordCount = new Map<string, number>();
  for (const { item } of sources) {
    const { base, variant } = splitName(productName(item));
    if (variant) continue;
    const word = normalize(firstWord(base));
    wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
  }

  const groups = new Map<
    string,
    { name: string; members: { source: GiftLineSource; label: string }[] }
  >();
  for (const source of sources) {
    const name = productName(source.item);
    const { base, variant } = splitName(name);
    const word = firstWord(base);
    const sharesWord = !variant && (wordCount.get(normalize(word)) ?? 0) >= 2;
    const familyName = sharesWord ? word : base;
    const key = normalize(familyName);
    const group = groups.get(key) ?? { name: familyName, members: [] };
    group.members.push({ source, label: variant ?? name });
    groups.set(key, group);
  }

  const orderOf = (key: string) => {
    const known = FAMILY_ORDER.indexOf(key);
    return known < 0 ? FAMILY_ORDER.length : known;
  };

  let previousWasSolo = false;
  let mirrorNext = false;
  const families = [...groups.entries()]
    .sort(([left], [right]) => orderOf(left) - orderOf(right))
    .map(([key, group]): GiftFamily => {
      const members = [...group.members].sort((left, right) =>
        (priceCents(left.source.item) ?? Number.MAX_SAFE_INTEGER) -
        (priceCents(right.source.item) ?? Number.MAX_SAFE_INTEGER)
      );
      const format = formatFor(members.length);
      const pieces = members.map(({ source, label }) =>
        toPiece(source, format, label)
      );
      const isSolo = format === "solo";
      const mirrored = isSolo && previousWasSolo && mirrorNext;
      mirrorNext = isSolo ? !mirrored : false;
      previousWasSolo = isSolo;
      return {
        key,
        name: group.name,
        format,
        mirrored,
        eyebrow: sharedEyebrow(pieces),
        phrase: pieces[pieces.length - 1].phrase,
        initialIndex: pieces.length - 1,
        // Na dupla, a peça maior abre a leitura; no seletor, a escala vai de P a G.
        pieces: format === "twins" ? [...pieces].reverse() : pieces,
      };
    });

  return { families };
}

type CollectionPage = {
  items: StorefrontProductV2[];
  pagination: { hasNextPage: boolean };
};

/**
 * Reúne todas as páginas da categoria e os detalhes das primeiras peças. A
 * falha de um detalhe não derruba a página: a peça usa os dados da listagem.
 */
export async function collectGiftLineSources(
  first: CollectionPage,
  fetchPage: (page: number) => Promise<CollectionPage>,
  fetchDetail: (slug: string) => Promise<GiftLineDetail>,
): Promise<GiftLineSource[]> {
  const items = [...first.items];
  let hasNextPage = first.pagination.hasNextPage;
  for (let page = 2; hasNextPage && page <= GIFT_LINE_MAX_PAGES; page++) {
    const next = await fetchPage(page);
    items.push(...next.items);
    hasNextPage = next.pagination.hasNextPage;
  }
  return await Promise.all(items.map(async (item, index) => ({
    item,
    detail: index < GIFT_LINE_DETAIL_LIMIT
      ? await fetchDetail(item.slug).catch(() => null)
      : null,
  })));
}
