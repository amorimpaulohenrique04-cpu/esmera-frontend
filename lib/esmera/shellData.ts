import {
  sanitizePublicHref,
  toCategoryNavigation,
  toFooter,
  toNavigation,
} from "../payload/adapters.ts";
import {
  buildNavigationTree,
  type NavigationNode,
  type StorefrontCategory,
} from "../payload/navigation.ts";
import type {
  NavigationLink,
  PayloadNavigation,
  PayloadSiteSettings,
  SEOModel,
} from "../payload/types.ts";
import { defaultHome } from "./homeBaseline.ts";

export type HeaderVariant = "transparent" | "solid";

export interface ShellFooter {
  siteName: string;
  statement: string;
  contactLabel: string;
  contactHref: string;
  privacyLabel: string;
  privacyHref: string;
  termsLabel: string;
  termsHref: string;
  location: string;
  whatsappLabel: string;
  whatsappHref: string;
}

export interface ResolvedShell {
  siteName: string;
  navigation: NavigationLink[];
  categories: NavigationLink[];
  menu: NavigationNode[];
  footer: ShellFooter;
  instagramHref: string;
  defaultSEO: SEOModel;
}

const FALLBACK_NAVIGATION: NavigationLink[] = [
  { label: "HOME", href: "/", external: false },
  { label: "PEÇAS", href: "/colecao", external: false },
  { label: "A ESMÉRA", href: "/sobre", external: false },
  { label: "CONTATO", href: "/contato", external: false },
];

const OFFICIAL_INSTAGRAM_HREF = "https://instagram.com/esmera.decor";

function present(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim() ?? "";
  return normalized || fallback;
}

function uniqueLinks(links: NavigationLink[]): NavigationLink[] {
  return links.filter((link, index) =>
    links.findIndex((candidate) => candidate.href === link.href) === index
  );
}

function ensureHomeLink(links: NavigationLink[]): NavigationLink[] {
  return uniqueLinks([
    FALLBACK_NAVIGATION[0],
    ...links.filter((link) => link.href !== "/"),
  ]);
}

function ensureHomeNode(nodes: NavigationNode[]): NavigationNode[] {
  return [
    {
      id: "navigation-home",
      label: "HOME",
      href: "/",
      external: false,
      visibility: "both",
      highlights: [],
      children: [],
    },
    ...nodes.filter((node) => node.href !== "/"),
  ];
}

function mergeFooter(settings: PayloadSiteSettings | null): ShellFooter {
  const cms = settings ? toFooter(settings) : null;
  const baseline = defaultHome.footer;
  return {
    siteName: present(settings?.siteName, baseline.siteName ?? "ESMÉRA"),
    statement: present(cms?.statement, baseline.statement ?? ""),
    contactLabel: present(
      cms?.contactLabel,
      baseline.contactLabel ?? "Contato",
    ),
    contactHref: present(cms?.contactHref, baseline.contactHref ?? "/contato"),
    privacyLabel: present(
      cms?.privacyLabel,
      baseline.privacyLabel ?? "Privacidade",
    ),
    privacyHref: present(
      cms?.privacyHref,
      baseline.privacyHref === "#contact"
        ? "/politica-de-privacidade"
        : baseline.privacyHref ?? "/politica-de-privacidade",
    ),
    termsLabel: present(cms?.termsLabel, baseline.termsLabel ?? "Termos"),
    termsHref: present(
      cms?.termsHref,
      baseline.termsHref === "#contact"
        ? "/termos"
        : baseline.termsHref ?? "/termos",
    ),
    location: present(cms?.location, baseline.location ?? ""),
    whatsappLabel: present(
      cms?.whatsappLabel,
      baseline.whatsappLabel ?? "WhatsApp",
    ),
    whatsappHref: present(cms?.whatsappHref, baseline.whatsappHref ?? ""),
  };
}

export function resolveShell(
  navigation: PayloadNavigation | null,
  settings: PayloadSiteSettings | null,
  categories: StorefrontCategory[],
): ResolvedShell {
  const siteName = present(settings?.siteName, "ESMÉRA");
  const footer = mergeFooter(settings);
  const cmsNavigation = navigation ? toNavigation(navigation) : [];
  const navigationLinks = ensureHomeLink(
    cmsNavigation.length > 0 ? cmsNavigation : FALLBACK_NAVIGATION,
  );
  const categoryLinks = uniqueLinks([
    ...(navigation ? toCategoryNavigation(navigation) : []),
    ...categories.map((category) => ({
      label: category.label,
      href: category.href || `/colecao/${category.slug}`,
      external: category.external,
    })),
  ]);
  const menu = ensureHomeNode(buildNavigationTree(categories, navigation));
  const instagram = settings?.officialChannels?.find((channel) =>
    channel.active !== false && channel.kind === "instagram"
  );
  const instagramHref = sanitizePublicHref(instagram?.url) ||
    sanitizePublicHref(instagram?.value) || OFFICIAL_INSTAGRAM_HREF;

  return {
    siteName,
    navigation: navigationLinks,
    categories: categoryLinks,
    menu,
    footer,
    instagramHref,
    defaultSEO: {
      title: present(settings?.defaultSeoTitle, siteName),
      description: present(
        settings?.defaultSeoDescription,
        "Objetos de matéria natural, design autoral e curadoria Esméra.",
      ),
      noindex: false,
    },
  };
}
