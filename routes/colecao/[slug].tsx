import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../../components/esmera/StorefrontLayout.tsx";
import {
  buildCatalogQuery,
  type CatalogFilter,
  hasCollectionRefinements,
  normalizeVisibleFilters,
} from "../../lib/payload/catalog.ts";
import {
  getCategoryBySlug,
  getCollectionPage,
  listProductsByCategory,
} from "../../lib/payload/loaders.ts";
import { getPageChrome } from "../../lib/payload/pageData.ts";
import type { StorefrontProductV2 } from "../../lib/esmera/storefront.ts";
import type { SEOModel } from "../../lib/payload/types.ts";
import MaterialFacets, {
  expandMaterialFilters,
  type MaterialFacet,
  resolveMaterialFilterKeys,
} from "../../loaders/Esmera/MaterialFacets.ts";
import Collection from "../../sections/Esmera/Collection.tsx";

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
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const [category, chrome, collectionPage, materials] = await Promise.all([
      getCategoryBySlug(ctx.params.slug),
      getPageChrome(),
      getCollectionPage(),
      MaterialFacets({ slug: ctx.params.slug }),
    ]);
    const url = new URL(req.url);
    if (!category) {
      return ctx.render({
        category: null,
        products: [],
        chrome,
        seo: {
          title: "Categoria não encontrada",
          description: "",
          noindex: true,
        },
        visibleFilters: [],
        query: buildCatalogQuery(url, [], []),
        totalDocs: 0,
        totalPages: 0,
        hasNextPage: false,
        baseHref: url.pathname,
        slug: ctx.params.slug,
        materials: [],
      }, { status: 404 });
    }
    const visibleFilters = normalizeVisibleFilters(
      collectionPage?.visibleFilters,
    ).filter((filter) => filter !== "category");
    const query = buildCatalogQuery(url, visibleFilters, chrome.categories);
    const materialQueryValues = expandMaterialFilters(
      query.materials,
      materials,
    );
    const products = await listProductsByCategory(category.slug, {
      limit: 24,
      page: query.page,
      sort: query.payloadSort,
      q: query.q.length >= 2 ? query.q : undefined,
      material: materialQueryValues.length
        ? materialQueryValues.join(",")
        : undefined,
      availability: query.availability || undefined,
    });
    const categorySEO = {
      ...category.seo,
      title: category.seo.title || category.title,
      description: category.seo.description || category.description,
    };
    return ctx.render({
      category,
      products: products.docs,
      chrome,
      seo: {
        ...categorySEO,
        canonical: categorySEO.canonical || `${url.origin}${url.pathname}`,
        noindex: categorySEO.noindex || hasCollectionRefinements(query),
      },
      visibleFilters,
      query,
      totalDocs: products.totalDocs,
      totalPages: products.totalPages,
      hasNextPage: products.hasNextPage,
      baseHref: `${url.pathname}${url.search}`,
      slug: ctx.params.slug,
      materials,
    });
  },
};

export default function CategoryRoute({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout {...data.chrome} seo={data.seo}>
      {data.category
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
            <h1>Categoria não encontrada</h1>
          </section>
        )}
    </StorefrontLayout>
  );
}
