export type Relationship<T, ID = string | number> = ID | T | null;

export interface PayloadPaginated<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface PayloadMediaSize {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  filename?: string | null;
}

export interface PayloadMedia {
  id: string | number;
  url?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  caption?: string | null;
  credit?: string | null;
  sizes?: {
    thumb?: PayloadMediaSize | null;
    card?: PayloadMediaSize | null;
    wide?: PayloadMediaSize | null;
    gallery?: PayloadMediaSize | null;
    territory?: PayloadMediaSize | null;
  } | null;
  _status?: "draft" | "published" | null;
}

export interface PayloadSEO {
  title?: string | null;
  description?: string | null;
  socialImage?: Relationship<PayloadMedia>;
  noindex?: boolean | null;
  canonical?: string | null;
}

export interface PayloadCTA {
  label?: string | null;
  href?: string | null;
  kind?: "internal" | "external" | "whatsapp" | null;
  destinationType?: "internal" | "external" | "whatsapp" | null;
  path?: string | null;
  url?: string | null;
}

export interface PayloadCategory {
  id: string | number;
  title: string;
  slug: string;
  status?: "active" | "archive" | null;
  parent?: Relationship<PayloadCategory>;
  description?: string | null;
  image?: Relationship<PayloadMedia>;
  order?: number | null;
  searchTerms?: Array<{ term?: string | null }> | null;
  seo?: PayloadSEO | null;
  _status?: "draft" | "published" | null;
}

export interface PayloadProductVariant {
  sku: string;
  selection?: Array<{ option?: string | null; value?: string | null }> | null;
  priceMode?: "inherit" | "fixed" | "inquiry" | null;
  priceCents?: number | null;
  status?: "enabled" | "disabled" | null;
  mediaKeys?: Array<{ key?: string | null }> | null;
}

export interface PayloadProduct {
  id: string | number;
  title: string;
  subtitle?: string | null;
  slug: string;
  code: string;
  catalogStatus?: "active" | "archived" | null;
  categories?: Array<Relationship<PayloadCategory>> | null;
  material?: string | null;
  description?: unknown;
  edition?: string | null;
  attributes?: Array<{ label?: string | null; value?: string | null }> | null;
  physicalSpecs?: EsmeraPhysicalSpecs | null;
  gallery?:
    | Array<{
      image?: Relationship<PayloadMedia>;
      mediaKey?: string | null;
      role?: "cover" | "detail" | "context" | "scale" | null;
      alt?: string | null;
    }>
    | null;
  availability?: "unique" | "available" | "made_to_order" | "limited" | null;
  priceMode?: "fixed" | "inquiry" | null;
  basePriceCents?: number | null;
  optionDefinitions?:
    | Array<{
      code?: string | null;
      label?: string | null;
      values?:
        | Array<
          {
            value?: string | null;
            label?: string | null;
            swatch?: string | null;
          }
        >
        | null;
    }>
    | null;
  variants?: PayloadProductVariant[] | null;
  searchTerms?: Array<{ term?: string | null }> | null;
  tags?: Array<{ tag?: string | null }> | null;
  seo?: PayloadSEO | null;
  _status?: "draft" | "published" | null;
}

export interface PayloadNavigation {
  mainLinks?: Array<PayloadCTA & { active?: boolean | null }> | null;
  categoryLinks?:
    | Array<
      PayloadCTA & {
        category?: Relationship<PayloadCategory>;
        active?: boolean | null;
      }
    >
    | null;
  utilityLinks?: Array<PayloadCTA & { active?: boolean | null }> | null;
  _status?: "draft" | "published" | null;
}

export interface PayloadSiteSettings {
  siteName?: string | null;
  defaultSeoTitle?: string | null;
  defaultSeoDescription?: string | null;
  officialChannels?:
    | Array<{
      label?: string | null;
      kind?:
        | "instagram"
        | "email"
        | "phone"
        | "whatsapp"
        | "website"
        | "other"
        | null;
      value?: string | null;
      url?: string | null;
      active?: boolean | null;
    }>
    | null;
  frontendURL?: string | null;
  footerStatement?: string | null;
  locationLabel?: string | null;
  privacyLabel?: string | null;
  privacyHref?: string | null;
  termsLabel?: string | null;
  termsHref?: string | null;
  _status?: "draft" | "published" | null;
}

export interface PayloadHome {
  heroMode?: "single" | "carousel" | null;
  heroSlides?:
    | Array<{
      desktopImage?: Relationship<PayloadMedia>;
      mobileImage?: Relationship<PayloadMedia>;
      statement?: string | null;
      callToAction?: PayloadCTA | null;
      active?: boolean | null;
    }>
    | null;
  autoplay?: boolean | null;
  autoplaySeconds?: number | null;
  manifestoEyebrow?: string | null;
  manifestoTitle?: string | null;
  manifestoCopy?: unknown;
  manifestoPrimaryImage?: Relationship<PayloadMedia>;
  manifestoSecondaryImage?: Relationship<PayloadMedia>;
  selectedProducts?: Array<Relationship<PayloadProduct>> | null;
  matterPanels?:
    | Array<{
      category?: Relationship<PayloadCategory>;
      image?: Relationship<PayloadMedia>;
      eyebrow?: string | null;
      headline?: string | null;
      copy?: string | null;
      callToAction?: PayloadCTA | null;
    }>
    | null;
  signatureSlides?:
    | Array<{
      product?: Relationship<PayloadProduct>;
      eyebrow?: string | null;
      headline?: string | null;
      copy?: string | null;
    }>
    | null;
  provenanceTitle?: string | null;
  provenanceCopy?: unknown;
  provenanceImage?: Relationship<PayloadMedia>;
  provenanceSteps?:
    | Array<{
      title?: string | null;
      copy?: string | null;
      image?:
        | Relationship<PayloadMedia>
        | {
          image?: Relationship<PayloadMedia>;
          alt?: string | null;
          caption?: string | null;
        };
      alt?: string | null;
      link?: PayloadCTA | null;
    }>
    | null;
  provenanceCallToAction?: PayloadCTA | null;
  seo?: PayloadSEO | null;
  _status?: "draft" | "published" | null;
}

export interface PayloadAbout {
  title?: string | null;
  eyebrow?: string | null;
  content?: unknown;
  image?: Relationship<PayloadMedia>;
  callToAction?: PayloadCTA | null;
  seo?: PayloadSEO | null;
  _status?: "draft" | "published" | null;
  [key: string]: unknown;
}

export interface PayloadContact extends PayloadAbout {
  channels?: PayloadSiteSettings["officialChannels"];
  hours?: string | null;
}

export interface PayloadCollectionPage {
  title?: string | null;
  eyebrow?: string | null;
  introduction?: unknown;
  visibleFilters?: string[] | Array<{ value?: string | null }> | null;
  emptyStateTitle?: string | null;
  emptyStateCopy?: string | null;
  callToAction?: PayloadCTA | null;
  seo?: PayloadSEO | null;
  _status?: "draft" | "published" | null;
  [key: string]: unknown;
}

export type AvailabilityStatus =
  | "unique"
  | "available"
  | "made_to_order"
  | "limited"
  | "archive";

export interface EsmeraVariant {
  sku: string;
  label: string;
  priceMode: "fixed" | "inquiry";
  priceCents: number | null;
  formattedPrice: string;
  isInquiry: boolean;
  disabled: boolean;
  mediaKeys: string[];
}

export interface EsmeraObject {
  id: string;
  slug: string;
  code: string;
  title: string;
  image: string;
  alt: string;
  availability: AvailabilityStatus;
  category?: string;
  material?: string;
  subtitle?: string;
  detailImage?: string;
  gallery: Array<{
    url: string;
    alt: string;
    width?: number;
    height?: number;
    fullUrl?: string;
    fullWidth?: number;
    fullHeight?: number;
    key: string;
    role: "cover" | "detail" | "context" | "scale";
  }>;
  description?: string;
  edition?: string;
  searchTerms?: string[];
  attributes: Array<{ label: string; value: string }>;
  physicalSpecs?: EsmeraPhysicalSpecs | null;
  priceMode: "fixed" | "inquiry";
  priceCents: number | null;
  formattedPrice: string;
  isInquiry: boolean;
  variants: EsmeraVariant[];
  seo: SEOModel;
  price?: string;
}

export interface EsmeraPhysicalSpecs {
  heightMm?: number | null;
  widthMm?: number | null;
}

export interface NavigationLink {
  label: string;
  href: string;
  external: boolean;
}

export interface SEOModel {
  title: string;
  description: string;
  image?: string;
  canonical?: string;
  noindex: boolean;
}
