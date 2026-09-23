import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../../components/esmera/StorefrontLayout.tsx";
import { getProductBySlug } from "../../lib/payload/loaders.ts";
import { getPageChrome } from "../../lib/payload/pageData.ts";
import type { EsmeraObject, SEOModel } from "../../lib/payload/types.ts";
import SignatureObject from "../../sections/Esmera/SignatureObject.tsx";

interface Data {
  product: EsmeraObject | null;
  chrome: Awaited<ReturnType<typeof getPageChrome>>;
  seo: SEOModel;
  jsonLd: unknown[];
}

function schemaAvailability(product: EsmeraObject): string {
  if (product.availability === "archive") {
    return "https://schema.org/OutOfStock";
  }
  if (product.availability === "made_to_order") {
    return "https://schema.org/PreOrder";
  }
  return "https://schema.org/InStock";
}

function productJsonLd(product: EsmeraObject, canonical: string): unknown[] {
  const images = Array.from(
    new Set([
      ...product.gallery.map((item) => item.url),
      product.image,
    ].filter(Boolean)),
  );
  const offer = product.priceCents !== null
    ? {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "BRL",
      price: (product.priceCents / 100).toFixed(2),
      availability: schemaAvailability(product),
      itemCondition: "https://schema.org/NewCondition",
    }
    : undefined;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: product.description || product.subtitle || undefined,
      image: images,
      sku: product.code || undefined,
      material: product.material || undefined,
      offers: offer,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: new URL("/", canonical).toString(),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: product.title,
          item: canonical,
        },
      ],
    },
  ];
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const [product, chrome] = await Promise.all([
      getProductBySlug(ctx.params.slug),
      getPageChrome(),
    ]);
    const url = new URL(req.url);
    const canonical = `${url.origin}${url.pathname}`;
    if (!product) {
      return ctx.render({
        product: null,
        chrome,
        seo: {
          title: "Objeto não encontrado | Esméra",
          description: "O objeto solicitado não foi encontrado.",
          noindex: true,
        },
        jsonLd: [],
      }, { status: 404 });
    }
    return ctx.render({
      product,
      chrome,
      seo: {
        ...product.seo,
        title: product.seo.title || product.title,
        description: product.seo.description || product.description || "",
        image: product.seo.image || product.gallery[0]?.url || product.image,
        canonical: product.seo.canonical || canonical,
      },
      jsonLd: productJsonLd(product, canonical),
    });
  },
};

export default function ProductRoute({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout
      {...data.chrome}
      seo={data.seo}
      ogType="product"
      jsonLd={data.jsonLd}
    >
      {data.product
        ? (
          <SignatureObject
            product={data.product}
            editorialText={data.product.description}
            showFullDetails
            headingLevel="h1"
          />
        )
        : (
          <section class="esv-shell esv-section">
            <h1>Objeto não encontrado</h1>
          </section>
        )}
    </StorefrontLayout>
  );
}
