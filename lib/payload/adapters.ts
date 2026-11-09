import { getPayloadBaseURL } from "./client.ts";
import { resolvePayloadMedia } from "./media.ts";
import { resolveProductPrice } from "./pricing.ts";
import { lexicalToText } from "./richText.ts";
import type {
  EsmeraObject,
  EsmeraVariant,
  NavigationLink,
  PayloadCategory,
  PayloadCTA,
  PayloadHome,
  PayloadMedia,
  PayloadNavigation,
  PayloadProduct,
  PayloadSEO,
  PayloadSiteSettings,
  Relationship,
  SEOModel,
} from "./types.ts";

function objectRelationship<T>(value: Relationship<T> | undefined): T | null {
  return value && typeof value === "object" ? value : null;
}

type PayloadImageField =
  | Relationship<PayloadMedia>
  | {
    image?: Relationship<PayloadMedia>;
    alt?: string | null;
    caption?: string | null;
  }
  | undefined;

function imageField(value: unknown): {
  relationship: Relationship<PayloadMedia> | undefined;
  alt?: string | null;
} {
  if (!value || typeof value !== "object") {
    return { relationship: value as Relationship<PayloadMedia> | undefined };
  }
  if ("image" in value) {
    const group = value as {
      image?: Relationship<PayloadMedia>;
      alt?: string | null;
    };
    return { relationship: group.image, alt: group.alt };
  }
  return { relationship: value as PayloadMedia };
}

function resolveImageField(
  value: unknown,
  baseURL: string,
  preferred: "thumb" | "card" | "gallery" | "wide" | "territory" | "original" =
    "original",
  fallbackAlt?: string | null,
) {
  const field = imageField(value);
  return resolvePayloadMedia(
    field.relationship,
    baseURL,
    preferred,
    field.alt || fallbackAlt,
  );
}

function cleanText(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function sanitizePublicHref(value?: string | null): string {
  const href = value?.trim() ?? "";
  if (!href || href.startsWith("//")) return "";
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function categoryName(
  categories: PayloadProduct["categories"],
): string | undefined {
  const category = categories?.map(objectRelationship).find(Boolean);
  return category?.title;
}

export function toProductGallery(
  product: PayloadProduct,
  baseURL = getPayloadBaseURL(),
) {
  return (product.gallery ?? []).flatMap((item) => {
    const media = resolvePayloadMedia(item.image, baseURL, "gallery", item.alt);
    return media
      ? [{ ...media, key: item.mediaKey ?? "", role: item.role ?? "detail" }]
      : [];
  });
}

export function toProductOptions(product: PayloadProduct): EsmeraVariant[] {
  return (product.variants ?? []).map((variant) => {
    const price = resolveProductPrice(product, variant);
    const labels = (variant.selection ?? []).map((selection) => {
      const option = product.optionDefinitions?.find((item) =>
        item.code === selection.option
      );
      const value = option?.values?.find((item) =>
        item.value === selection.value
      );
      return value?.label || selection.value || "";
    }).filter(Boolean);
    return {
      sku: variant.sku,
      label: labels.join(" / ") || variant.sku,
      ...price,
      disabled: variant.status === "disabled",
      mediaKeys: (variant.mediaKeys ?? []).map((item) => item.key ?? "").filter(
        Boolean,
      ),
    };
  });
}

export function toEsmeraObject(
  product: PayloadProduct,
  baseURL = getPayloadBaseURL(),
): EsmeraObject | null {
  if (product._status !== "published" || product.catalogStatus !== "active") {
    return null;
  }
  const gallery = toProductGallery(product, baseURL);
  const cover = gallery.find((item) => item.role === "cover") ?? gallery[0];
  if (!cover) return null;
  const detail = gallery.find((item) =>
    item.role === "detail" && item.url !== cover.url
  );
  const price = resolveProductPrice(product);
  const availability = product.availability ?? "available";
  return {
    id: String(product.id),
    slug: product.slug,
    code: product.code,
    title: product.title,
    subtitle: product.subtitle ?? undefined,
    image: cover.url,
    detailImage: detail?.url,
    gallery,
    alt: cover.alt,
    availability,
    category: categoryName(product.categories),
    material: product.material ?? undefined,
    description: lexicalToText(product.description),
    edition: product.edition ?? undefined,
    attributes: (product.attributes ?? []).flatMap((item) =>
      item.label && item.value ? [{ label: item.label, value: item.value }] : []
    ),
    physicalSpecs: product.physicalSpecs ?? undefined,
    searchTerms: (product.searchTerms ?? []).map((item) => item.term ?? "")
      .filter(Boolean),
    ...price,
    price: price.formattedPrice,
    variants: toProductOptions(product),
    seo: toSEO(product.seo, null, baseURL),
  };
}

export function toCategory(
  category: PayloadCategory,
  baseURL = getPayloadBaseURL(),
) {
  if (category._status !== "published" || category.status !== "active") {
    return null;
  }
  return {
    id: String(category.id),
    title: category.title,
    slug: category.slug,
    description: category.description ?? "",
    order: category.order ?? 100,
    image: resolvePayloadMedia(category.image, baseURL, "card"),
    seo: toSEO(category.seo, null, baseURL),
  };
}

export function resolveCallToAction(
  cta?: PayloadCTA | null,
): NavigationLink | null {
  const label = cta?.label?.trim();
  const destinationType = cta?.kind ?? cta?.destinationType;
  const rawHref = cta?.href ??
    (destinationType === "internal" ? cta?.path : cta?.url);
  const href = sanitizePublicHref(rawHref);
  if (!label || !href) return null;
  return {
    label,
    href,
    external: destinationType === "external" || /^https?:\/\//i.test(href),
  };
}

export function toNavigation(navigation: PayloadNavigation): NavigationLink[] {
  return [...(navigation.mainLinks ?? []), ...(navigation.utilityLinks ?? [])]
    .filter((link) => link.active !== false)
    .map(resolveCallToAction)
    .filter((link): link is NavigationLink => Boolean(link));
}

export function toCategoryNavigation(
  navigation: PayloadNavigation,
): NavigationLink[] {
  return (navigation.categoryLinks ?? []).filter((link) =>
    link.active !== false
  ).flatMap((link) => {
    const resolved = resolveCallToAction(link);
    if (resolved) return [resolved];
    const category = objectRelationship(link.category);
    return category
      ? [{
        label: link.label || category.title,
        href: `/colecao/${category.slug}`,
        external: false,
      }]
      : [];
  });
}

export function toFooter(settings: PayloadSiteSettings) {
  const channels = (settings.officialChannels ?? []).filter((channel) =>
    channel.active !== false
  );
  const email = channels.find((channel) => channel.kind === "email");
  const whatsapp = channels.find((channel) => channel.kind === "whatsapp");
  const normalizedPhone = whatsapp?.value?.replace(/\D/g, "") ?? "";
  return {
    statement: settings.footerStatement ?? "",
    contactLabel: email?.label || email?.value || "",
    contactHref: sanitizePublicHref(email?.url) ||
      (email?.value ? sanitizePublicHref(`mailto:${email.value.trim()}`) : ""),
    location: settings.locationLabel ?? "",
    privacyLabel: settings.privacyLabel ?? "",
    privacyHref: sanitizePublicHref(settings.privacyHref),
    termsLabel: settings.termsLabel ?? "",
    termsHref: sanitizePublicHref(settings.termsHref),
    whatsappLabel: whatsapp?.label || "WhatsApp",
    whatsappHref: sanitizePublicHref(whatsapp?.url) ||
      (normalizedPhone ? `https://wa.me/${normalizedPhone}` : ""),
  };
}

export function toHero(home: PayloadHome, baseURL = getPayloadBaseURL()) {
  const slides = (home.heroSlides ?? []).filter((slide) =>
    slide.active !== false
  ).flatMap((slide) => {
    const desktop = resolveImageField(slide.desktopImage, baseURL, "wide");
    const statement = cleanText(slide.statement);
    if (!desktop || !statement) return [];
    const mobile = resolveImageField(slide.mobileImage, baseURL, "card");
    return [{
      desktopImage: desktop.url,
      mobileImage: mobile?.url,
      alt: desktop.alt,
      statement,
      cta: resolveCallToAction(slide.callToAction),
    }];
  });
  return {
    mode: home.heroMode ?? "single",
    slides,
    autoplay: home.autoplay === true,
    autoplaySeconds: Math.min(12, Math.max(3, home.autoplaySeconds ?? 6)),
  };
}

export function toManifesto(home: PayloadHome, baseURL = getPayloadBaseURL()) {
  const main = resolveImageField(
    home.manifestoPrimaryImage,
    baseURL,
    "card",
  );
  const secondary = resolveImageField(
    home.manifestoSecondaryImage,
    baseURL,
    "card",
  );
  const result = {
    eyebrow: cleanText(home.manifestoEyebrow),
    title: cleanText(home.manifestoTitle),
    text: lexicalToText(home.manifestoCopy) || undefined,
    mainImage: main?.url,
    mainImageAlt: main?.alt,
    secondaryImage: secondary?.url,
    secondaryImageAlt: secondary?.alt,
  };
  return Object.values(result).some(Boolean) ? result : null;
}

export function toSelectedObjects(
  home: PayloadHome,
  baseURL = getPayloadBaseURL(),
): EsmeraObject[] {
  return (home.selectedProducts ?? []).flatMap((product) => {
    const resolved = objectRelationship(product);
    const adapted = resolved ? toEsmeraObject(resolved, baseURL) : null;
    return adapted ? [adapted] : [];
  }).slice(0, 4);
}

export function toMatterPanels(
  home: PayloadHome,
  baseURL = getPayloadBaseURL(),
) {
  return (home.matterPanels ?? []).map((panel) => {
    const image = resolveImageField(panel.image, baseURL, "territory");
    const category = objectRelationship(panel.category);
    return {
      image: image?.url,
      alt: image?.alt,
      eyebrow: cleanText(panel.eyebrow),
      title: cleanText(panel.headline),
      text: cleanText(panel.copy),
      cta: resolveCallToAction(panel.callToAction),
      category: category
        ? {
          label: category.title,
          href: `/colecao/${category.slug}`,
          external: false,
        }
        : null,
    };
  }).slice(0, 3);
}

export function toSignatureSlides(
  home: PayloadHome,
  baseURL = getPayloadBaseURL(),
) {
  return (home.signatureSlides ?? []).flatMap((slide) => {
    const product = objectRelationship(slide.product);
    const adapted = product ? toEsmeraObject(product, baseURL) : null;
    return adapted
      ? [{
        product: adapted,
        eyebrow: cleanText(slide.eyebrow),
        headline: cleanText(slide.headline) ?? adapted.title,
        editorialText: cleanText(slide.copy) ?? adapted.description ?? "",
      }]
      : [];
  }).slice(0, 6);
}

export function toProvenance(home: PayloadHome, baseURL = getPayloadBaseURL()) {
  const overview = resolveImageField(home.provenanceImage, baseURL, "wide");
  const stages = (home.provenanceSteps ?? []).map((stage) => {
    const image = resolveImageField(stage.image, baseURL, "wide", stage.alt);
    const link = resolveCallToAction(stage.link);
    return {
      title: cleanText(stage.title),
      text: cleanText(stage.copy),
      image: image?.url,
      alt: image?.alt || cleanText(stage.alt),
      linkLabel: link?.label,
      linkHref: link?.href,
    };
  });
  const result = {
    title: cleanText(home.provenanceTitle),
    text: lexicalToText(home.provenanceCopy) || undefined,
    image: overview?.url,
    imageAlt: overview?.alt,
    stages,
    cta: resolveCallToAction(home.provenanceCallToAction),
  };
  return Object.values(result).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    )
    ? result
    : null;
}

export function toSEO(
  seo: PayloadSEO | null | undefined,
  defaults: PayloadSiteSettings | null = null,
  baseURL = getPayloadBaseURL(),
): SEOModel {
  return {
    title: seo?.title || defaults?.defaultSeoTitle || "",
    description: seo?.description || defaults?.defaultSeoDescription || "",
    image: resolvePayloadMedia(seo?.socialImage, baseURL, "wide")?.url,
    canonical: sanitizePublicHref(seo?.canonical) || undefined,
    noindex: seo?.noindex === true,
  };
}
