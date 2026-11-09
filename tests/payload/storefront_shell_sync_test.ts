import { assertEquals, assertThrows } from "@std/assert";
import {
  catalogFacetCategories,
  collectionFacetCategories,
} from "../../lib/esmera/categoryFacets.ts";
import { resolveShell } from "../../lib/esmera/shellData.ts";
import { PayloadAPIError } from "../../lib/payload/errors.ts";
import {
  pageDataFromBootstrap,
  type StorefrontBootstrap,
} from "../../loaders/Esmera/StorefrontPageData.ts";
import type { MiddlewareHandlerContext } from "$fresh/server.ts";
import { handler } from "../../routes/_middleware.ts";
import StorefrontPageData from "../../loaders/Esmera/StorefrontPageData.ts";

function node(id: string, slug: string, label: string, children = []) {
  return {
    id,
    title: label,
    label,
    slug,
    nodeType: "collection" as const,
    href: `/colecao/${slug}`,
    visibility: "all" as const,
    children,
  };
}

const bootstrap: StorefrontBootstrap = {
  version: 1,
  home: null,
  siteSettings: null,
  revision: "rev-9",
  navigation: {
    roots: [
      node("92", "escultura", "ESCULTURA"),
      node("94", "presenteaveis", "PRESENTEÁVEIS"),
      node("3", "colecoes", "COLEÇÕES"),
    ],
  },
  catalogCategories: [
    {
      id: 92,
      title: "ESCULTURA",
      slug: "escultura",
      parentId: null,
      order: 100,
    },
    {
      id: 94,
      title: "PRESENTEÁVEIS",
      slug: "presenteaveis",
      parentId: null,
      order: 100,
    },
    { id: 3, title: "COLEÇÕES", slug: "colecoes", parentId: null, order: 3900 },
    {
      id: 93,
      title: "Caixa-Quadro Acrílico",
      slug: "caixa-quadro-acrilico",
      parentId: 3,
      order: 4000,
    },
  ],
};

Deno.test("Escultura sem categoria principal é item próprio, fora de COLEÇÕES", () => {
  const data = pageDataFromBootstrap(bootstrap);
  const { menu } = resolveShell(null, null, data.categories);
  assertEquals(menu.map((item) => item.label), [
    "HOME",
    "ESCULTURA",
    "PRESENTEÁVEIS",
    "COLEÇÕES",
  ]);
  const colecoes = menu.find((item) => item.label === "COLEÇÕES");
  assertEquals(colecoes?.children, []);
});

Deno.test("Presenteáveis e Escultura aparecem no desktop e no mobile", () => {
  const data = pageDataFromBootstrap(bootstrap);
  const { menu } = resolveShell(null, null, data.categories);
  for (const label of ["ESCULTURA", "PRESENTEÁVEIS"]) {
    const item = menu.find((candidate) => candidate.label === label);
    assertEquals(item?.visibility, "both");
    assertEquals(item?.href.startsWith("/colecao/"), true);
  }
});

Deno.test("categoria fora do menu continua disponível nos filtros", () => {
  const data = pageDataFromBootstrap(bootstrap);
  assertEquals(
    data.categories.some((item) => item.slug === "caixa-quadro-acrilico"),
    false,
  );
  const facets = catalogFacetCategories(data);
  assertEquals(facets.map((item) => item.slug), [
    "escultura",
    "presenteaveis",
    "colecoes",
    "caixa-quadro-acrilico",
  ]);
  assertEquals(facets[3].href, "/colecao/caixa-quadro-acrilico");
});

Deno.test("CMS antigo, sem catalogCategories, mantém os filtros do menu", () => {
  const data = pageDataFromBootstrap({
    ...bootstrap,
    catalogCategories: undefined,
  });
  assertEquals(
    catalogFacetCategories(data),
    collectionFacetCategories(data.categories),
  );
});

Deno.test("resposta sem navegação conta como falha, em vez de menu vazio", () => {
  assertThrows(
    () =>
      pageDataFromBootstrap(
        { version: 1, home: null, siteSettings: null } as never,
      ),
    PayloadAPIError,
  );
});

Deno.test("sem nenhum dado o menu de contingência tem links reais", () => {
  const { menu } = resolveShell(null, null, []);
  assertEquals(menu.map((item) => item.href), [
    "/",
    "/colecao",
    "/sobre",
    "/contato",
  ]);
});

function htmlContext(render: () => Promise<void> = () => Promise.resolve()) {
  return {
    next: async () => {
      await render();
      return new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  } as unknown as MiddlewareHandlerContext;
}

const productionRequest = () =>
  new Request("https://www.esmeradecor.com.br/colecao/escultura");

// Ordem importa: o estado do loader é do módulo e a falha fica registrada.
Deno.test("página saudável fica no máximo 30 s + 15 s no Cloudflare", async () => {
  const response = await handler(productionRequest(), htmlContext());
  assertEquals(
    response.headers.get("cloudflare-cdn-cache-control"),
    "public, max-age=30, stale-while-revalidate=15, stale-if-error=86400",
  );
});

Deno.test("página degradada nunca é guardada em cache", async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const logs: string[] = [];
  console.error = (message: string) => logs.push(message);
  globalThis.fetch = () => Promise.reject(new TypeError("offline"));
  try {
    const response = await handler(
      productionRequest(),
      htmlContext(async () => {
        const data = await StorefrontPageData();
        assertEquals(data.unavailable, ["home", "shell"]);
        assertEquals(data.categories, []);
      }),
    );
    assertEquals(response.headers.get("cache-control"), "no-store");
    assertEquals(
      response.headers.get("cloudflare-cdn-cache-control"),
      "no-store",
    );
    assertEquals(JSON.parse(logs[0]).event, "storefront_shell_refresh_failed");
    assertEquals(JSON.parse(logs[0]).errorType, "network");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});
