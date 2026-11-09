import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../../components/esmera/StorefrontLayout.tsx";
import {
  fetchStorefrontCollection,
  type StorefrontMediaV2,
} from "../../lib/esmera/storefront.ts";
import {
  buildCatalogQuery,
  type CatalogFilter,
  hasCollectionRefinements,
  normalizeVisibleFilters,
} from "../../lib/payload/catalog.ts";
import { isPayloadAPIError } from "../../lib/payload/errors.ts";
import { storefrontParams } from "../../lib/payload/loaders.ts";
import { getPageChrome } from "../../lib/payload/pageData.ts";
import type { StorefrontProductV2 } from "../../lib/esmera/storefront.ts";
import type { SEOModel } from "../../lib/payload/types.ts";
import {
  normalizeMaterials,
  type MaterialFacet,
  resolveMaterialFilterKeys,
} from "../../loaders/Esmera/MaterialFacets.ts";
import Collection from "../../sections/Esmera/Collection.tsx";
import GiftLinePage from "../../components/esmera/GiftLinePage.tsx";
import {
  buildGiftLine,
  collectGiftLineSources,
  GIFT_LINE_SLUG,
  type GiftLineViewModel,
} from "../../lib/esmera/giftLine.ts";
import { fetchStorefrontProduct } from "../../lib/esmera/storefront.ts";

interface Data {
  category: {
    id: string;
    title: string;
    description: string;
    seo: SEOModel;
  } | null;
  products: StorefrontProductV2[];
  chrome: Awaited<ReturnType<typeof getPageChrome>>;
  seo: SEOModel;
  visibleFilters: CatalogFilter[];
  query: ReturnType<typeof buildCatalogQuery>;
  totalDocs: number;
  totalPages: number;
  hasNextPage: boolean;
  baseHref: string;
  slug: string;
  materials: MaterialFacet[];
  giftLine?: GiftLineViewModel | null;
  giftLineCover?: StorefrontMediaV2 | null;
}

const COLLECTION_FILTERS: CatalogFilter[] = [
  "material",
  "availability",
  "sort",
];

type CollectionSEO = {
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  noIndex?: boolean;
  socialImage?: StorefrontMediaV2 | null;
};

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const chrome = await getPageChrome();
    const url = new URL(req.url);
    const query = buildCatalogQuery(url, COLLECTION_FILTERS, []);

    try {
      const response = await fetchStorefrontCollection(
        ctx.params.slug,
        storefrontParams({
          limit: 24,
          page: query.page,
          sort: query.payloadSort,
          q: query.q.length >= 2 ? query.q : undefined,
          material: query.materials.length
            ? query.materials.join(",")
            : undefined,
          availability: query.availability || undefined,
        }),
      );

      const rawSEO = response.category.seo as CollectionSEO | null | undefined;
      const categorySEO: SEOModel = {
        title: rawSEO?.title || response.category.title,
        description: rawSEO?.description || response.category.description ||
          "",
        image: rawSEO?.socialImage?.url,
        canonical: rawSEO?.canonical || undefined,
        noindex: rawSEO?.noIndex === true,
      };
      const category = {
        id: response.category.id,
        title: response.category.title,
        description: response.category.description || "",
        seo: categorySEO,
      };
      const visibleFilters = normalizeVisibleFilters(
        response.category.visibleFilters,
      ).filter((filter) => filter !== "category");
      const materials = normalizeMaterials(
        (response.facets as { materials?: unknown }).materials,
        12,
      );

      // Só a vitrine limpa de Presenteáveis usa a página editorial. Com filtros,
      // ou se os dados vierem incompletos, segue a coleção padrão.
      let giftLine: GiftLineViewModel | null = null;
      if (
        ctx.params.slug === GIFT_LINE_SLUG && response.items.length > 0 &&
        !hasCollectionRefinements(query)
      ) {
        try {
          giftLine = buildGiftLine(
            await collectGiftLineSources(
              response,
              (page) =>
                fetchStorefrontCollection(
                  GIFT_LINE_SLUG,
                  storefrontParams({
                    limit: 24,
                    page,
                    sort: query.payloadSort,
                  }),
                ),
              async (slug) => (await fetchStorefrontProduct(slug)).product,
            ),
          );
        } catch (error) {
          console.error("Linha Presenteável indisponível", error);
        }
      }

      return ctx.render({
        giftLine,
        giftLineCover: response.category.image ?? null,
        category,
        products: response.items,
        chrome,
        seo: {
          ...categorySEO,
          canonical: categorySEO.canonical || `${url.origin}${url.pathname}`,
          noindex: categorySEO.noindex || hasCollectionRefinements(query),
        },
        visibleFilters,
        query,
        totalDocs: response.pagination.totalDocs,
        totalPages: response.pagination.totalPages,
        hasNextPage: response.pagination.hasNextPage,
        baseHref: `${url.pathname}${url.search}`,
        slug: ctx.params.slug,
        materials,
      });
    } catch (error) {
      const status = isPayloadAPIError(error) && error.status === 404 ? 404 : 502;
      return ctx.render({
        category: null,
        products: [],
        chrome,
        seo: {
          title: status === 404
            ? "Categoria não encontrada"
            : "Coleção temporariamente indisponível",
          description: "",
          noindex: true,
        },
        visibleFilters: [],
        query,
        totalDocs: 0,
        totalPages: 0,
        hasNextPage: false,
        baseHref: url.pathname,
        slug: ctx.params.slug,
        materials: [],
      }, { status });
    }
  },
};

export default function CategoryRoute({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout {...data.chrome} seo={data.seo}>
      {data.category && data.giftLine
        ? (
          <GiftLinePage
            line={data.giftLine}
            coverImage={data.giftLineCover}
          />
        )
        : data.category
        ? (
          <Collection
            eyebrow="Coleção"
            title={data.category.title}
            text={data.category.description}
            products={data.products}
            totalDocs={data.totalDocs}
            hasNextPage={data.hasNextPage}
            endpoint={`/api/esmera-collection?slug=${
              encodeURIComponent(data.slug)
            }`}
            filters={{
              visible: data.visibleFilters,
              categories: [],
              materials: data.materials,
              q: data.query.q,
              category: "",
              materialValues: resolveMaterialFilterKeys(
                data.query.materials,
                data.materials,
              ),
              availability: data.query.availability,
              sort: data.query.sort,
            }}
            pagination={{
              page: data.query.page,
              totalPages: data.totalPages,
              baseHref: data.baseHref,
            }}
          />
        )
        : (
          <section class="esv-shell esv-section">
            <h1>
              {data.seo.title === "Categoria não encontrada"
                ? "Categoria não encontrada"
                : "Coleção temporariamente indisponível"}
            </h1>
          </section>
        )}
    </StorefrontLayout>
  );
}
