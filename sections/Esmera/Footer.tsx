import Icon from "../../components/ui/Icon.tsx";
import FooterLeadForm from "../../islands/FooterLeadForm.tsx";
import {
  loadResolvedHome,
  type ResolvedHome,
} from "../../lib/esmera/homeData.ts";
import type { NavigationNode } from "../../lib/payload/navigation.ts";
import type { NavigationLink } from "../../lib/payload/types.ts";

export interface Props {
  siteName?: string;
  statement?: string;
  contactLabel?: string;
  contactHref?: string;
  privacyLabel?: string;
  privacyHref?: string;
  termsLabel?: string;
  termsHref?: string;
  location?: string;
  whatsappLabel?: string;
  whatsappHref?: string;
  instagramHref?: string;
  collectionLinks?: NavigationLink[];
  categoryTree?: NavigationNode[];
}

export const loader = async (props: Props) => ({
  ...props,
  resolvedHome: await loadResolvedHome(),
});

function normalizedLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function resolvePieceLinks(
  tree: NavigationNode[],
  fallbackLinks: NavigationLink[],
): NavigationLink[] {
  const piecesRoot = tree.find((node) =>
    node.href === "/colecao/pecas" || normalizedLabel(node.label) === "pecas"
  );

  const fromTree = (piecesRoot?.children ?? [])
    .filter((node) => Boolean(node.href))
    .map((node) => ({
      label: node.label,
      href: node.href,
      external: node.external,
    }));

  if (fromTree.length > 0) return fromTree.slice(0, 6);

  const fromBackend = fallbackLinks
    .filter((link) => link.href.startsWith("/colecao/"))
    .filter((link, index, links) =>
      links.findIndex((candidate) => candidate.href === link.href) === index
    )
    .slice(0, 6);

  return fromBackend.length > 0
    ? fromBackend
    : [{ label: "Todas as peças", href: "/colecao", external: false }];
}

function ExternalAttrs({ external }: { external: boolean }) {
  if (!external) return null;
  return <span class="esv-sr-only">Abre em uma nova janela</span>;
}

function InstagramGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.25"
        y="3.25"
        width="17.5"
        height="17.5"
        rx="4.75"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <circle cx="17.35" cy="6.75" r="1" fill="currentColor" />
    </svg>
  );
}

export default function Footer(
  props: Props & { resolvedHome?: ResolvedHome },
) {
  const source = props.resolvedHome?.footer ?? props;
  if (!source.siteName && !source.contactHref && !source.statement) return null;

  const year = new Date().getFullYear();
  const pieces = resolvePieceLinks(
    props.categoryTree ?? [],
    props.collectionLinks ?? [],
  );
  const contactHref = source.contactHref || "#contact";
  const instagramHref = props.instagramHref || "";
  const siteName = source.siteName || "ESMÉRA";

  const institutionalLinks = [
    { label: "A Esméra", href: "/pagina/a-esmera" },
    { label: "Contato", href: contactHref },
  ];

  return (
    <footer id="footer" class="esv-footer esv-footer-premium">
      <div class="esv-footer-shell">
        <div class="esv-footer-grid">
          <section class="esv-footer-brand" aria-label={`Sobre ${siteName}`}>
            <a
              class="esv-footer-wordmark"
              href="/"
              aria-label={`${siteName} — início`}
            >
              <img
                class="esv-brand-image esv-footer-logo-image"
                src="/esmera-logo.png"
                alt=""
                width="1225"
                height="369"
                loading="lazy"
                decoding="async"
              />
            </a>
            <span class="esv-footer-accent-line" aria-hidden="true" />
            <p class="esv-footer-tagline">
              Joias para o lar.
            </p>
            <p class="esv-footer-description">
              Peças autorais em pedras naturais, criadas a partir da matéria, do
              design e do fazer manual. Da pedra à forma, cada criação carrega sua
              própria história.
            </p>
            <span class="esv-footer-curation-badge">Curadoria autoral</span>
          </section>

          <nav
            class="esv-footer-column"
            aria-labelledby="esv-footer-collections"
          >
            <h2 id="esv-footer-collections" class="esv-footer-heading">
              Peças
            </h2>
            <ul class="esv-footer-links">
              {pieces.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                  >
                    <span>{link.label}</span>
                    <ExternalAttrs external={link.external} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav
            class="esv-footer-column"
            aria-labelledby="esv-footer-institutional"
          >
            <h2 id="esv-footer-institutional" class="esv-footer-heading">
              Institucional
            </h2>
            <ul class="esv-footer-links">
              {institutionalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <section
            id="contact"
            class="esv-footer-column esv-footer-relationship"
            aria-labelledby="esv-footer-relationship"
          >
            <p class="esv-footer-newsletter-eyebrow">Acompanhe a Esméra</p>
            <h2
              id="esv-footer-relationship"
              class="esv-footer-newsletter-title"
            >
              Novos lançamentos, matérias e peças especiais.
            </h2>
            <p class="esv-footer-newsletter-copy">
              Receba curadorias e novidades em primeira mão.
            </p>

            <FooterLeadForm />

            <div class="esv-footer-socials">
              {source.whatsappHref && (
                <a
                  class="esv-footer-social"
                  href={source.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style="padding-right:16px"
                >
                  <Icon id="WhatsApp" size={20} aria-hidden="true" />
                  <span>{source.whatsappLabel || "WhatsApp"}</span>
                  <span class="esv-footer-social-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              )}
              {instagramHref && (
                <a
                  class="esv-footer-social"
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramGlyph size={20} />
                  <span>Instagram</span>
                  <span class="esv-footer-social-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              )}
            </div>
          </section>
        </div>

        <div class="esv-footer-bottom-bar">
          <span class="esv-footer-copyright">© {year} {siteName}</span>

          <nav class="esv-footer-legal" aria-label="Informações legais">
            {source.privacyHref && (
              <a href={source.privacyHref}>{source.privacyLabel}</a>
            )}
            {source.termsHref && (
              <a href={source.termsHref}>{source.termsLabel}</a>
            )}
          </nav>

          <div class="esv-footer-bottom-socials" aria-hidden="true">
            <span class="esv-footer-mark">
              <svg viewBox="0 0 32 42" role="presentation">
                <path d="M16 1 29 21 16 41 3 21 16 1Z" />
                <path d="M16 8 24 21 16 34 8 21 16 8Z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {source.whatsappHref && (
        <a
          class="esv-whatsapp-sticky"
          href={source.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com a Esméra no WhatsApp"
        >
          <Icon id="WhatsApp" size={18} aria-hidden="true" />
          <span class="esv-whatsapp-label">
            {source.whatsappLabel || "WhatsApp"}
          </span>
        </a>
      )}
    </footer>
  );
}
