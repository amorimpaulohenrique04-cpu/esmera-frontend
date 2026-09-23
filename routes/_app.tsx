import { asset, Head } from "$fresh/runtime.ts";
import { defineApp } from "$fresh/server.ts";
import Theme from "../sections/Theme/Theme.tsx";
import { Context } from "@deco/deco";

export default defineApp(async (_req, ctx) => {
  const revision = await Context.active().release?.revision();
  // Preserve the stable storefront token for unchanged CSS contracts and bump
  // only the layers that own new visual behavior.
  const storefrontStyleRevision = "2026-09-23-mobile-header-five-zone-v37";
  const productCardStyleRevision = "2026-09-23-favorites-modal-v4";
  const aboutStyleRevision = "2026-09-23-privacy-editorial-v2";
  const homeStyleRevision = "2026-09-23-motion-handoff-v38";
  const footerStyleRevision = "2026-08-15-footer-whatsapp-form-v3";
  const homeArtDirectionRevision = "2026-09-23-home-art-direction-v4";
  const homeLengthRevision =
    "2026-09-23-home-length-refinement-v5-tablet-section6";
  const mobileRecoveryRevision = "2026-09-23-mobile-recovery-v5";
  const shellCroRevision = "2026-09-23-shell-cro-v2";
  const pathname = ctx.url.pathname;
  const isHome = pathname === "/";
  const isCatalog = pathname === "/colecao" || pathname.startsWith("/colecao/");
  const isAbout = pathname === "/sobre" || pathname === "/pagina/a-esmera";
  const isFavorites = pathname === "/favoritos";
  const hasProductCards = isHome || isCatalog || isFavorites;
  return (
    <>
      <Theme colorScheme="any" />

      <Head>
        <link
          href={asset(`/styles.css?revision=${revision}`)}
          rel="stylesheet"
        />

        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossorigin=""
        />
        <link
          rel="preconnect"
          href="https://esmeracms-green.vercel.app"
          crossorigin=""
        />
        <link
          rel="stylesheet"
          href={asset(`/esmera-master.css?v=${storefrontStyleRevision}`)}
        />
        <link rel="stylesheet" href={asset("/esmera-finish.css")} />
        <link
          rel="stylesheet"
          href={asset("/esmera-commerce-refine.css")}
        />
        <link
          rel="preload"
          as="style"
          href={asset(
            `/esmera-product-modal.css?v=${storefrontStyleRevision}`,
          )}
        />
        <meta
          name="esmera-product-modal-css"
          content={asset(
            `/esmera-product-modal.css?v=${storefrontStyleRevision}`,
          )}
        />

        {isHome && (
          <>
            <link
              rel="stylesheet"
              href={asset(
                `/esmera-matter-interaction.css?v=${homeStyleRevision}`,
              )}
            />
            <link
              rel="stylesheet"
              href={asset(
                `/esmera-home-art-direction-v2.css?v=${homeArtDirectionRevision}`,
              )}
            />
            <link
              rel="stylesheet"
              href={asset(
                `/esmera-home-length-refinement-v3.css?v=${homeLengthRevision}`,
              )}
            />
          </>
        )}
        {isCatalog && (
          <>
            <link
              rel="stylesheet"
              href={asset(
                `/esmera-catalog-v2.css?v=${storefrontStyleRevision}`,
              )}
            />
            <link
              rel="stylesheet"
              href={asset(
                `/esmera-collection-filter-v3.css?v=${storefrontStyleRevision}`,
              )}
            />
          </>
        )}

        <link
          rel="stylesheet"
          href={asset(`/esmera-header.css?v=${storefrontStyleRevision}`)}
        />
        <link
          rel="stylesheet"
          href={asset(`/esmera-shell-cro-v1.css?v=${shellCroRevision}`)}
        />
        {hasProductCards && (
          <link
            rel="stylesheet"
            href={asset(
              `/esmera-product-card.css?v=${productCardStyleRevision}`,
            )}
          />
        )}
        <link
          rel="stylesheet"
          href={asset(`/esmera-motion-v2.css?v=${homeStyleRevision}`)}
        />
        <link
          rel="stylesheet"
          href={asset("/esmera-accessibility-p1-v1.css")}
        />
        {isAbout && (
          <link
            rel="stylesheet"
            href={asset(`/esmera-about-page.css?v=${aboutStyleRevision}`)}
          />
        )}
        <link
          rel="stylesheet"
          href={asset(`/esmera-footer.css?v=${footerStyleRevision}`)}
        />
        <link
          rel="stylesheet"
          href={asset(
            `/esmera-mobile-recovery-v4.css?v=${mobileRecoveryRevision}`,
          )}
        />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="manifest" href={asset("/site.webmanifest")} />
        <link
          rel="icon"
          type="image/svg+xml"
          sizes="any"
          href={asset("/favicon-esmera.svg?v=20260822")}
        />
        <link rel="apple-touch-icon" href={asset("/apple-touch-icon.png")} />
        <meta name="theme-color" content="#111210" />
      </Head>

      <ctx.Component />
    </>
  );
});
