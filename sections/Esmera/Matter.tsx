import { ImageWidget } from "apps/admin/widgets.ts";
import { EsmeraImage } from "../../components/esmera/ResponsiveMedia.tsx";
import { mergeDefined } from "../../lib/esmera/editorialProps.ts";
import {
  loadResolvedHome,
  type ResolvedHome,
} from "../../lib/esmera/homeData.ts";
import type { NavigationLink } from "../../lib/payload/types.ts";

export interface TerritoryPanel {
  image: ImageWidget;
  alt: string;
  eyebrow: string;
  title: string;
  text?: string;
  category?: NavigationLink | null;
  cta?: NavigationLink | null;
}

export interface Props {
  panels?: TerritoryPanel[];
}

const baselineCategoryLinks: Record<string, NavigationLink> = {
  esculturas: {
    label: "Explorar esculturas",
    href: "/colecao/esculturas",
    external: false,
  },
  vasos: {
    label: "Explorar vasos",
    href: "/colecao/vasos",
    external: false,
  },
  bandejas: {
    label: "Explorar bandejas",
    href: "/colecao/bandejas",
    external: false,
  },
};

function normalizeCategoryKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getPanelDestination(
  panel: TerritoryPanel,
): NavigationLink | null {
  return panel.category ?? panel.cta ??
    baselineCategoryLinks[normalizeCategoryKey(panel.eyebrow)] ?? null;
}

export const loader = async (props: Props) => ({
  ...props,
  resolvedHome: await loadResolvedHome(),
});

function PanelContent(
  { panel, destination }: {
    panel: TerritoryPanel;
    destination?: NavigationLink | null;
  },
) {
  return (
    <>
      <figure class="esv-territory-media">
        <EsmeraImage
          src={panel.image}
          alt={panel.alt}
          loading="lazy"
          decoding="async"
          width={1200}
          height={2160}
          sizes="(max-width: 767px) 100vw, 33vw"
        />
      </figure>
      <div class="esv-territory-shade" aria-hidden="true" />
      <div class="esv-territory-copy">
        <span class="esv-kicker esv-kicker-light">{panel.eyebrow}</span>
        <h2>{panel.title}</h2>
        {panel.text && <p>{panel.text}</p>}
        {destination && (
          <span class="esv-territory-link" aria-hidden="true">
            {destination.label}
          </span>
        )}
      </div>
    </>
  );
}

export default function Matter(
  props: Props & { resolvedHome?: ResolvedHome },
) {
  if (props.resolvedHome?.matter === null) return null;
  const { resolvedHome, ...editorialProps } = props;
  const source = mergeDefined<Props>(resolvedHome?.matter, editorialProps);
  const panels = source.panels ?? [];
  if (panels.length === 0) return null;
  return (
    <section
      id="territory"
      class="esv-territory"
      aria-label="Território Esméra"
    >
      <div class="esv-territory-track">
        {panels.slice(0, 3).map((panel, index) => {
          const destination = getPanelDestination(panel);
          const key = `${panel.title}-${index}`;

          return destination
            ? (
              <a
                key={key}
                class="esv-territory-panel is-clickable"
                href={destination.href}
                target={destination.external ? "_blank" : undefined}
                rel={destination.external ? "noopener noreferrer" : undefined}
                aria-label={`${destination.label}: ${panel.title}`}
                data-motion="reveal"
                data-motion-order={String(index)}
              >
                <PanelContent
                  panel={panel}
                  destination={destination}
                />
              </a>
            )
            : (
              <article
                key={key}
                class="esv-territory-panel"
                data-motion="reveal"
                data-motion-order={String(index)}
              >
                <PanelContent panel={panel} />
              </article>
            );
        })}
      </div>
    </section>
  );
}
