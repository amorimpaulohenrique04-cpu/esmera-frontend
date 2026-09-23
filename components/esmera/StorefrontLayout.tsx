import type { ComponentChildren } from "preact";
import {
  type HeaderVariant,
  resolveShell,
} from "../../lib/esmera/shellData.ts";
import type { StorefrontCategory } from "../../lib/payload/navigation.ts";
import type {
  PayloadNavigation,
  PayloadSiteSettings,
  SEOModel,
} from "../../lib/payload/types.ts";
import Footer from "../../sections/Esmera/Footer.tsx";
import Header from "../../sections/Esmera/Header.tsx";
import StorefrontSEO from "./StorefrontSEO.tsx";

export interface Props {
  children: ComponentChildren;
  navigation: PayloadNavigation | null;
  settings: PayloadSiteSettings | null;
  categories: StorefrontCategory[];
  seo?: SEOModel;
  canonical?: string;
  headerVariant?: HeaderVariant;
  ogType?: "website" | "product";
  jsonLd?: unknown[];
}

export default function StorefrontLayout(
  {
    children,
    navigation,
    settings,
    categories,
    seo,
    canonical,
    headerVariant = "solid",
    ogType = "website",
    jsonLd = [],
  }: Props,
) {
  const shell = resolveShell(navigation, settings, categories);

  return (
    <>
      <StorefrontSEO
        seo={seo}
        fallback={shell.defaultSEO}
        canonical={canonical}
        ogType={ogType}
        jsonLd={jsonLd}
      />
      <Header
        logo={shell.siteName}
        menu={shell.menu}
        whatsappHref={shell.footer.whatsappHref}
        instagramHref={shell.instagramHref}
        variant={headerVariant}
      />
      <main id="main-content">{children}</main>
      <Footer
        {...shell.footer}
        collectionLinks={shell.categories}
        categoryTree={shell.menu}
        instagramHref={shell.instagramHref}
      />
    </>
  );
}
