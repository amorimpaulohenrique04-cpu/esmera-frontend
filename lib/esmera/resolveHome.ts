import {
  toCategoryNavigation,
  toFooter,
  toHero,
  toManifesto,
  toMatterPanels,
  toNavigation,
  toProvenance,
  toSelectedObjects,
  toSignatureSlides,
} from "../payload/adapters.ts";
import type {
  StorefrontDataSource,
  StorefrontDiagnostic,
} from "../payload/contract/diagnostics.ts";
import type {
  NavigationLink,
  PayloadHome,
  PayloadNavigation,
  PayloadSiteSettings,
} from "../payload/types.ts";
import type { Props as FooterProps } from "../../sections/Esmera/Footer.tsx";
import type { Props as HeroProps } from "../../sections/Esmera/Hero.tsx";
import type { Props as ManifestoProps } from "../../sections/Esmera/Manifesto.tsx";
import type {
  Props as MatterProps,
  TerritoryPanel,
} from "../../sections/Esmera/Matter.tsx";
import type { Props as MatterInterludeProps } from "../../sections/Esmera/MatterInterlude.tsx";
import type { Props as PrivateInvitationProps } from "../../sections/Esmera/PrivateInvitation.tsx";
import type {
  Props as ProvenanceProps,
  ProvenanceStage,
} from "../../sections/Esmera/Provenance.tsx";
import type { Props as SelectedObjectsProps } from "../../sections/Esmera/SelectedObjects.tsx";
import type { Props as SignatureObjectProps } from "../../sections/Esmera/SignatureObject.tsx";
import { defaultHome, type HomeHeaderBaseline } from "./homeBaseline.ts";

export interface PublicCategoryLink {
  title: string;
  slug: string;
}

export type HomeSourceInput = {
  home?: StorefrontDataSource;
  navigation?: StorefrontDataSource;
  siteSettings?: StorefrontDataSource;
  categories?: StorefrontDataSource;
};

export interface ResolveHomeInput {
  home?: PayloadHome | null;
  navigation?: PayloadNavigation | null;
  siteSettings?: PayloadSiteSettings | null;
  categories?: PublicCategoryLink[];
  sources?: HomeSourceInput;
  diagnostics?: StorefrontDiagnostic[];
  stale?: boolean;
}

export type HomeSectionSourceMap = {
  header: StorefrontDataSource;
  hero: StorefrontDataSource;
  manifesto: StorefrontDataSource;
  selectedObjects: StorefrontDataSource;
  matter: StorefrontDataSource;
  signature: StorefrontDataSource;
  matterInterlude: StorefrontDataSource;
  provenance: StorefrontDataSource;
  privateInvitation: StorefrontDataSource;
  footer: StorefrontDataSource;
};

export interface ResolvedHome {
  header: HomeHeaderBaseline;
  hero: HeroProps | null;
  manifesto: ManifestoProps | null;
  selectedObjects: SelectedObjectsProps | null;
  matter: MatterProps | null;
  signature: SignatureObjectProps[] | null;
  matterInterlude: MatterInterludeProps | null;
  provenance: ProvenanceProps | null;
  privateInvitation: PrivateInvitationProps | null;
  footer: FooterProps;
  sources: HomeSectionSourceMap;
  diagnostics: StorefrontDiagnostic[];
  stale: boolean;
}

type HomeWithDisabledSections = PayloadHome & {
  disabledSections?: string[] | null;
};

function present<T>(value: T | null | undefined, fallback: T): T {
  if (typeof value === "string" && value.trim() === "") return fallback;
  return value ?? fallback;
}

function uniqueLinks(links: NavigationLink[]): NavigationLink[] {
  return links.filter((link, index) =>
    links.findIndex((candidate) => candidate.href === link.href) === index
  );
}

function mergeFooter(
  settings: PayloadSiteSettings | null | undefined,
): FooterProps {
  const cms = settings ? toFooter(settings) : null;
  const baseline = defaultHome.footer;
  return {
    siteName: present(settings?.siteName, baseline.siteName ?? "ESMÉRA"),
    statement: present(cms?.statement, baseline.statement ?? ""),
    contactLabel: present(cms?.contactLabel, baseline.contactLabel ?? ""),
    contactHref: present(cms?.contactHref, baseline.contactHref ?? ""),
    privacyLabel: present(cms?.privacyLabel, baseline.privacyLabel ?? ""),
    privacyHref: present(cms?.privacyHref, baseline.privacyHref ?? ""),
    termsLabel: present(cms?.termsLabel, baseline.termsLabel ?? ""),
    termsHref: present(cms?.termsHref, baseline.termsHref ?? ""),
    location: present(cms?.location, baseline.location ?? ""),
    whatsappLabel: present(
      cms?.whatsappLabel,
      baseline.whatsappLabel ?? "WhatsApp",
    ),
    whatsappHref: present(cms?.whatsappHref, baseline.whatsappHref ?? ""),
  };
}

function mergeMatterPanel(
  baseline: TerritoryPanel,
  override?: Partial<TerritoryPanel>,
): TerritoryPanel {
  return {
    image: present(override?.image, baseline.image),
    alt: present(override?.alt, baseline.alt),
    eyebrow: present(override?.eyebrow, baseline.eyebrow),
    title: present(override?.title, baseline.title),
    text: present(override?.text, baseline.text ?? ""),
    category: override?.category ?? baseline.category ?? null,
    cta: override?.cta ?? baseline.cta ?? null,
  };
}

function mergeProvenanceStage(
  baseline: ProvenanceStage | undefined,
  override: Partial<ProvenanceStage> | undefined,
): ProvenanceStage | null {
  const image = present(override?.image, baseline?.image ?? "");
  const title = present(override?.title, baseline?.title ?? "");
  const text = present(override?.text, baseline?.text ?? "");
  if (!image || !title || !text) return null;
  return {
    image,
    title,
    text,
    alt: present(override?.alt, baseline?.alt ?? ""),
    linkLabel: present(override?.linkLabel, baseline?.linkLabel ?? ""),
    linkHref: present(override?.linkHref, baseline?.linkHref ?? ""),
  };
}

function normalizedSource(
  source: StorefrontDataSource | undefined,
  hasPayloadData: boolean,
): StorefrontDataSource {
  if (hasPayloadData) {
    return source === "stale_payload" ? "stale_payload" : "payload_override";
  }
  return source === "unavailable" ? "unavailable" : "deco_baseline";
}

function sectionSource(
  disabled: boolean,
  hasOverride: boolean,
  homeSource: StorefrontDataSource,
): StorefrontDataSource {
  if (disabled) return "disabled";
  if (hasOverride) {
    return homeSource === "stale_payload"
      ? "stale_payload"
      : "payload_override";
  }
  return "deco_baseline";
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function resolveHome({
  home,
  navigation,
  siteSettings,
  categories = [],
  sources = {},
  diagnostics = [],
  stale = false,
}: ResolveHomeInput): ResolvedHome {
  const publishedHome = home?._status === "draft" ? null : home;
  const disabled = new Set(
    (publishedHome as HomeWithDisabledSections | null)?.disabledSections ?? [],
  );
  const homeSource = normalizedSource(sources.home, Boolean(publishedHome));
  const navigationSource = normalizedSource(
    sources.navigation,
    Boolean(navigation),
  );
  const settingsSource = normalizedSource(
    sources.siteSettings,
    Boolean(siteSettings),
  );
  const categoriesSource = normalizedSource(
    sources.categories,
    categories.length > 0,
  );
  const footer = mergeFooter(siteSettings);

  const cmsNavigation = navigation ? toNavigation(navigation) : [];
  const navigationLinks = cmsNavigation.length > 0
    ? cmsNavigation
    : defaultHome.header.navigation ?? [];
  const categoryLinks = uniqueLinks([
    ...(navigation ? toCategoryNavigation(navigation) : []),
    ...categories.map((category) => ({
      label: category.title,
      href: `/colecao/${category.slug}`,
      external: false,
    })),
  ]);
  const header: HomeHeaderBaseline = {
    ...defaultHome.header,
    logo: present(siteSettings?.siteName, defaultHome.header.logo ?? "ESMÉRA"),
    navigation: navigationLinks,
    categories: categoryLinks,
    whatsappHref: footer.whatsappHref,
  };

  const cmsHero = publishedHome ? toHero(publishedHome) : null;
  const hasHeroOverride = Boolean(cmsHero && cmsHero.slides.length > 0);
  const hero: HeroProps | null = disabled.has("hero")
    ? null
    : hasHeroOverride && cmsHero
    ? {
      ...defaultHome.hero,
      ...cmsHero,
      overlay: defaultHome.hero.overlay,
      focalPoint: defaultHome.hero.focalPoint,
    }
    : { ...defaultHome.hero };

  const cmsManifesto = publishedHome ? toManifesto(publishedHome) : null;
  const hasManifestoOverride = Boolean(
    publishedHome &&
      (hasText(publishedHome.manifestoEyebrow) ||
        hasText(publishedHome.manifestoTitle) ||
        publishedHome.manifestoCopy ||
        publishedHome.manifestoPrimaryImage ||
        publishedHome.manifestoSecondaryImage),
  );
  const manifesto: ManifestoProps | null = disabled.has("manifesto") ? null : {
    ...defaultHome.manifesto,
    eyebrow: present(
      cmsManifesto?.eyebrow,
      defaultHome.manifesto.eyebrow ?? "",
    ),
    title: present(cmsManifesto?.title, defaultHome.manifesto.title ?? ""),
    text: present(cmsManifesto?.text, defaultHome.manifesto.text ?? ""),
    mainImage: present(
      cmsManifesto?.mainImage,
      defaultHome.manifesto.mainImage ?? "",
    ),
    mainImageAlt: present(
      cmsManifesto?.mainImageAlt,
      defaultHome.manifesto.mainImageAlt ?? "",
    ),
    secondaryImage: present(
      cmsManifesto?.secondaryImage,
      defaultHome.manifesto.secondaryImage ?? "",
    ),
    secondaryImageAlt: present(
      cmsManifesto?.secondaryImageAlt,
      defaultHome.manifesto.secondaryImageAlt ?? "",
    ),
  };

  const cmsSelectedObjects = publishedHome
    ? toSelectedObjects(publishedHome)
    : [];
  const hasSelectedObjectsOverride = cmsSelectedObjects.length > 0;
  const selectedObjects: SelectedObjectsProps | null = disabled.has(
      "selectedObjects",
    )
    ? null
    : {
      ...defaultHome.selectedObjects,
      products: hasSelectedObjectsOverride
        ? cmsSelectedObjects
        : defaultHome.selectedObjects.products ?? [],
    };

  const cmsMatter = publishedHome ? toMatterPanels(publishedHome) : [];
  const hasMatterOverride = cmsMatter.length > 0;
  const baselinePanels = defaultHome.matter.panels ?? [];
  const matter: MatterProps | null = disabled.has("matter") ? null : {
    panels: baselinePanels.map((panel, index) =>
      mergeMatterPanel(panel, cmsMatter[index])
    ),
  };

  const cmsSignature = publishedHome ? toSignatureSlides(publishedHome) : [];
  const hasSignatureOverride = cmsSignature.length > 0;
  const signature: SignatureObjectProps[] | null = disabled.has("signature")
    ? null
    : (hasSignatureOverride
      ? cmsSignature.map((slide) => ({
        product: slide.product,
        eyebrow: present(slide.eyebrow, "05 — Peça assinatura"),
        editorialText: present(
          slide.editorialText,
          slide.product.description ?? "",
        ),
      }))
      : [...defaultHome.signature]);

  const matterInterlude: MatterInterludeProps | null = disabled.has(
      "matterInterlude",
    )
    ? null
    : { ...defaultHome.matterInterlude };

  const cmsProvenance = publishedHome ? toProvenance(publishedHome) : null;
  const hasProvenanceOverride = Boolean(
    publishedHome &&
      (hasText(publishedHome.provenanceTitle) ||
        publishedHome.provenanceCopy ||
        publishedHome.provenanceImage ||
        (publishedHome.provenanceSteps?.length ?? 0) > 0),
  );
  const baselineStages = defaultHome.provenance.stages ?? [];
  const cmsStages = cmsProvenance?.stages ?? [];
  const stageCount = Math.max(baselineStages.length, cmsStages.length);
  const stages = Array.from(
    { length: stageCount },
    (_, index) => mergeProvenanceStage(baselineStages[index], cmsStages[index]),
  ).filter((stage): stage is ProvenanceStage => Boolean(stage));
  const provenance: ProvenanceProps | null = disabled.has("provenance")
    ? null
    : {
      ...defaultHome.provenance,
      eyebrow: defaultHome.provenance.eyebrow,
      title: present(
        cmsProvenance?.title,
        defaultHome.provenance.title ?? "",
      ),
      text: present(
        cmsProvenance?.text,
        defaultHome.provenance.text ?? "",
      ),
      image: present(
        cmsProvenance?.image,
        defaultHome.provenance.image ?? "",
      ) || undefined,
      imageAlt: present(
        cmsProvenance?.imageAlt,
        defaultHome.provenance.imageAlt ?? "",
      ),
      stages,
      cta: cmsProvenance?.cta ?? defaultHome.provenance.cta ?? null,
    };

  const privateInvitation: PrivateInvitationProps | null = disabled.has(
      "privateInvitation",
    )
    ? null
    : {
      ...defaultHome.privateInvitation,
      ctaHref: footer.whatsappHref || footer.contactHref ||
        defaultHome.privateInvitation.ctaHref,
    };

  const headerUsesPayload = cmsNavigation.length > 0 ||
    categoryLinks.length > 0 ||
    Boolean(siteSettings);
  const headerSource = headerUsesPayload
    ? [navigationSource, settingsSource, categoriesSource].includes(
        "stale_payload",
      )
      ? "stale_payload"
      : "payload_override"
    : "deco_baseline";

  return {
    header,
    hero,
    manifesto,
    selectedObjects,
    matter,
    signature,
    matterInterlude,
    provenance,
    privateInvitation,
    footer,
    sources: {
      header: headerSource,
      hero: sectionSource(disabled.has("hero"), hasHeroOverride, homeSource),
      manifesto: sectionSource(
        disabled.has("manifesto"),
        hasManifestoOverride,
        homeSource,
      ),
      selectedObjects: sectionSource(
        disabled.has("selectedObjects"),
        hasSelectedObjectsOverride,
        homeSource,
      ),
      matter: sectionSource(
        disabled.has("matter"),
        hasMatterOverride,
        homeSource,
      ),
      signature: sectionSource(
        disabled.has("signature"),
        hasSignatureOverride,
        homeSource,
      ),
      matterInterlude: disabled.has("matterInterlude")
        ? "disabled"
        : "deco_baseline",
      provenance: sectionSource(
        disabled.has("provenance"),
        hasProvenanceOverride,
        homeSource,
      ),
      privateInvitation: disabled.has("privateInvitation")
        ? "disabled"
        : "deco_baseline",
      footer: siteSettings ? settingsSource : "deco_baseline",
    },
    diagnostics,
    stale,
  };
}
