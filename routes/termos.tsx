import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../components/esmera/StorefrontLayout.tsx";
import { getPageChrome } from "../lib/payload/pageData.ts";

interface Data {
  chrome: Awaited<ReturnType<typeof getPageChrome>>;
  canonical: string;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const chrome = await getPageChrome();
    const url = new URL(req.url);
    return ctx.render({ chrome, canonical: `${url.origin}${url.pathname}` });
  },
};

export default function TermsPage({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout
      {...data.chrome}
      canonical={data.canonical}
      seo={{
        title: "Termos de Uso | Esméra",
        description:
          "Condições gerais de uso do catálogo digital e dos canais de atendimento Esméra.",
        noindex: false,
      }}
    >
      <article class="esv-shell esv-section esv-editorial-page">
        <header class="esv-editorial-page-head">
          <p class="esv-kicker">INSTITUCIONAL</p>
          <h1>Termos de Uso</h1>
          <p>Última atualização: 7 de agosto de 2026.</p>
        </header>
        <div class="esv-editorial-page-copy">
          <h2>Catálogo</h2>
          <p>
            O site apresenta o catálogo digital da Esméra. Disponibilidade,
            variações, medidas, valores e condições finais podem ser confirmados
            durante o atendimento antes da conclusão de qualquer pedido.
          </p>
          <h2>Atendimento e pedidos</h2>
          <p>
            Quando um atendimento é continuado por WhatsApp ou outro canal
            oficial, as informações finais do pedido são confirmadas diretamente
            com a curadoria Esméra.
          </p>
          <h2>Conteúdo e imagens</h2>
          <p>
            Fotografias, textos, identidade visual e demais conteúdos do site
            são apresentados para identificação e divulgação dos objetos Esméra
            e não devem ser reutilizados comercialmente sem autorização.
          </p>
          <h2>Atualizações</h2>
          <p>
            O catálogo e estes termos podem ser atualizados para refletir
            mudanças de produtos, serviços e operação. A versão publicada nesta
            página é a referência vigente do storefront.
          </p>
          <a class="esv-text-link" href="/contato">Falar com a Esméra</a>
        </div>
      </article>
    </StorefrontLayout>
  );
}
