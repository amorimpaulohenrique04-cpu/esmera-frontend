import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../components/esmera/StorefrontLayout.tsx";
import { institutionalBaseline } from "../lib/esmera/institutionalBaseline.ts";
import { getPayloadBaseURL } from "../lib/payload/client.ts";
import { lexicalToText } from "../lib/payload/richText.ts";
import {
  resolveCallToAction,
  sanitizePublicHref,
  toSEO,
} from "../lib/payload/adapters.ts";
import { resolvePayloadMedia } from "../lib/payload/media.ts";
import { getContact } from "../lib/payload/loaders.ts";
import { getPageChrome } from "../lib/payload/pageData.ts";
import type {
  PayloadContact,
  PayloadSiteSettings,
  SEOModel,
} from "../lib/payload/types.ts";
import Manifesto from "../sections/Esmera/Manifesto.tsx";

type ContactChannel = NonNullable<
  PayloadSiteSettings["officialChannels"]
>[number];

function channelHref(channel: ContactChannel): string {
  if (channel.url) return sanitizePublicHref(channel.url);
  const value = channel.value?.trim() ?? "";
  if (!value) return "";
  if (channel.kind === "email") return sanitizePublicHref(`mailto:${value}`);
  if (channel.kind === "phone") {
    return sanitizePublicHref(`tel:${value.replace(/[^\d+]/g, "")}`);
  }
  if (channel.kind === "whatsapp") {
    const phone = value.replace(/\D/g, "");
    return phone ? sanitizePublicHref(`https://wa.me/${phone}`) : "";
  }
  return "";
}

interface Data {
  page: PayloadContact | null;
  chrome: Awaited<ReturnType<typeof getPageChrome>>;
  seo: SEOModel;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const [page, chrome] = await Promise.all([getContact(), getPageChrome()]);
    const url = new URL(req.url);
    const seo = toSEO(page?.seo, chrome.settings);
    return ctx.render({
      page,
      chrome,
      seo: {
        ...seo,
        title: seo.title || "Contato | Esméra",
        description: seo.description || institutionalBaseline.contact.text,
        canonical: seo.canonical || `${url.origin}${url.pathname}`,
      },
    });
  },
};

export default function ContactRoute({ data }: PageProps<Data>) {
  const page = data.page;
  const image = page
    ? resolvePayloadMedia(page.image, getPayloadBaseURL(), "wide")
    : null;
  const cta = resolveCallToAction(page?.callToAction) ?? {
    label: institutionalBaseline.contact.ctaLabel,
    href: institutionalBaseline.contact.ctaHref,
    external: false,
  };
  const title = page?.title?.trim() || institutionalBaseline.contact.title;
  const eyebrow = page?.eyebrow?.trim() ||
    institutionalBaseline.contact.eyebrow;
  const text = lexicalToText(page?.content) ||
    institutionalBaseline.contact.text;
  const hasEditorialFeature = Boolean(page?.title && image);
  const channels =
    (page?.channels ?? data.chrome.settings?.officialChannels ?? [])
      .filter((channel) => channel.active !== false && channelHref(channel));

  return (
    <StorefrontLayout {...data.chrome} seo={data.seo}>
      {hasEditorialFeature && image && (
        <Manifesto
          eyebrow={eyebrow}
          title={title}
          text={text}
          mainImage={image.url}
          mainImageAlt={image.alt}
          ctaLabel={cta.label}
          ctaHref={cta.href}
        />
      )}
      <section class="esv-shell esv-section">
        {!hasEditorialFeature && (
          <>
            <p class="esv-kicker">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{text}</p>
            <a class="esv-text-link" href={cta.href}>{cta.label}</a>
          </>
        )}
        {page?.hours && <p>{page.hours}</p>}
        {channels.length > 0 && (
          <ul>
            {channels.map((channel) => (
              <li key={`${channel.kind}-${channel.value}`}>
                <a href={channelHref(channel)}>
                  {channel.label || channel.value}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StorefrontLayout>
  );
}
