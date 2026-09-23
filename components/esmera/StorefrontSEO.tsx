import { Head } from "$fresh/runtime.ts";
import type { SEOModel } from "../../lib/payload/types.ts";

export interface Props {
  seo?: SEOModel;
  fallback: SEOModel;
  canonical?: string;
  ogType?: "website" | "product";
  jsonLd?: unknown[];
}

function safeJSON(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function StorefrontSEO({
  seo,
  fallback,
  canonical,
  ogType = "website",
  jsonLd = [],
}: Props) {
  const title = seo?.title?.trim() || fallback.title;
  const description = seo?.description?.trim() || fallback.description;
  const image = seo?.image || fallback.image;
  const resolvedCanonical = seo?.canonical || canonical || fallback.canonical;
  const noindex = seo?.noindex === true;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noindex ? "noindex,nofollow" : "index,follow"}
      />
      {resolvedCanonical && <link rel="canonical" href={resolvedCanonical} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {resolvedCanonical && (
        <meta property="og:url" content={resolvedCanonical} />
      )}
      {image && <meta property="og:image" content={image} />}
      <meta
        name="twitter:card"
        content={image ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd.map((item, index) => (
        <script key={`jsonld-${index}`} type="application/ld+json">
          {safeJSON(item)}
        </script>
      ))}
    </Head>
  );
}
