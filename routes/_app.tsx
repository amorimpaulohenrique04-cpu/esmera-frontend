import { asset, Head } from "$fresh/runtime.ts";
import { defineApp } from "$fresh/server.ts";
import Theme from "../sections/Theme/Theme.tsx";
import { Context } from "@deco/deco";

interface StyleLinkProps {
  href: string;
  deferred?: boolean;
}

function StyleLink({ href, deferred = false }: StyleLinkProps) {
  if (!deferred) return <link rel="stylesheet" href={href} />;

  return (
    <>
      <link
        rel="stylesheet"
        href={href}
        media="print"
        data-esmera-deferred-style="true"
      />
      <noscript>
        <link rel="stylesheet" href={href} />
      </noscript>
    </>
  );
}

const DEFERRED_STYLE_BOOTSTRAP = `(() => {
  const selector = 'link[data-esmera-deferred-style="true"]';
  let applied = false;
  const apply = () => {
    if (applied) return;
    applied = true;
    document.querySelectorAll(selector).forEach((node) => {
      node.media = "all";
      node.removeAttribute("data-esmera-deferred-style");
    });
  };
  const schedule = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(apply, { timeout: 1200 });
    } else {
      window.setTimeout(apply, 0);
    }
  };
  ["pointerdown", "keydown", "scroll"].forEach((eventName) => {
    window.addEventListener(eventName, apply, { once: true, passive: true });
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();`;

export default defineApp(async (_req, ctx) => {
  const revision = await Context.active().release?.revision();
  const criticalStyleRevision = "2026-09-23-p3-critical-v1";
  const storefrontStyleRevision = "2026-09-23-p3-css-split-v1";
  const productCardStyleRevision = "2026-09-23-favorites-modal-v4";
  const aboutStyleRevision = "2026-09-23-privacy-editorial-v2";
  const homeStyleRevision = "2026-09-23-p3-motion-v1";
  const footerStyleRevision = "2026-08-15-footer-whatsapp-form-v3";
  const homeArtDirectionRevision = "2026-09-23-p3-home-art-v1";
  const homeLengthRevision = "2026-09-23-p3-home-length-v1";
  const mobileRecoveryRevision = "2026-09-23-p3-mobile-recovery-v1";
  const shellCroRevision = "2026-09-23-p3-shell-cro-v1";
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
          rel="stylesheet"
          href={asset(`/esmera-critical.css?v=${criticalStyleRevision}`)}
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          crossorigin=""
          href={asset("/fonts/inter-latin-wght-normal.woff2")}
        />

        <StyleLink
          href={asset(`/styles.css?revision=${revision}`)}
          deferred={isHome}
        />
        <StyleLink
          href={asset(`/esmera-master.css?v=${storefrontStyleRevision}`)}
          deferred={isHome}
        />
        <StyleLink href={asset("/esmera-finish.css")} deferred={isHome} />
        <StyleLink
          href={asset("/esmera-commerce-refine.css")}
          deferred={isHome}
        />

        <meta
          name="esmera-product-modal-css"
          content={asset(
            `/esmera-product-modal.css?v=${storefrontStyleRevision}`,
          )}
        />

        {isHome && (
          <>
            <StyleLink
              href={asset(
                `/esmera-matter-interaction.css?v=${homeStyleRevision}`,
              )}
              deferred
            />
            <StyleLink
              href={asset(
                `/esmera-home-art-direction-v2.css?v=${homeArtDirectionRevision}`,
              )}
              deferred
            />
            <StyleLink
              href={asset(
                `/esmera-home-length-refinement-v3.css?v=${homeLengthRevision}`,
              )}
              deferred
            />
          </>
        )}
        {isCatalog && (
          <>
            <StyleLink
              href={asset(
                `/esmera-catalog-v2.css?v=${storefrontStyleRevision}`,
              )}
            />
            <StyleLink
              href={asset(
                `/esmera-collection-filter-v3.css?v=${storefrontStyleRevision}`,
              )}
            />
          </>
        )}

        <StyleLink
          href={asset(`/esmera-header.css?v=${storefrontStyleRevision}`)}
          deferred={isHome}
        />
        <StyleLink
          href={asset(`/esmera-shell-cro-v1.css?v=${shellCroRevision}`)}
          deferred={isHome}
        />
        {hasProductCards && (
          <StyleLink
            href={asset(
              `/esmera-product-card.css?v=${productCardStyleRevision}`,
            )}
            deferred={isHome}
          />
        )}
        <StyleLink
          href={asset(`/esmera-motion-v2.css?v=${homeStyleRevision}`)}
          deferred={isHome}
        />
        <StyleLink
          href={asset("/esmera-accessibility-p1-v1.css")}
          deferred={isHome}
        />
        {isAbout && (
          <StyleLink
            href={asset(`/esmera-about-page.css?v=${aboutStyleRevision}`)}
          />
        )}
        <StyleLink
          href={asset(`/esmera-footer.css?v=${footerStyleRevision}`)}
          deferred={isHome}
        />
        <StyleLink
          href={asset(
            `/esmera-mobile-recovery-v4.css?v=${mobileRecoveryRevision}`,
          )}
          deferred={isHome}
        />

        {isHome && (
          <script
            id="esmera-deferred-style-bootstrap"
            dangerouslySetInnerHTML={{ __html: DEFERRED_STYLE_BOOTSTRAP }}
          />
        )}

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
