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

export default function PrivacyPage({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout
      {...data.chrome}
      canonical={data.canonical}
      seo={{
        title: "Política de Privacidade | Esméra",
        description:
          "Como a Esméra trata informações fornecidas no site e nos canais de atendimento.",
        noindex: false,
      }}
    >
      <article class="esv-shell esv-section esv-editorial-page">
        <header class="esv-editorial-page-head">
          <p class="esv-kicker">INSTITUCIONAL</p>
          <h1>Política de Privacidade</h1>
          <p>Última atualização: 7 de agosto de 2026.</p>
        </header>
        <div class="esv-editorial-page-copy">
          <h2>Informações tratadas</h2>
          <p>
            A Esméra pode tratar informações fornecidas voluntariamente durante
            contatos, solicitações de disponibilidade e atendimento, além de
            dados técnicos necessários para o funcionamento e a segurança do
            site.
          </p>
          <h2>Finalidades</h2>
          <p>
            As informações são utilizadas para responder solicitações, organizar
            o atendimento, viabilizar pedidos e melhorar a experiência do
            storefront.
          </p>
          <h2>Serviços de terceiros</h2>
          <p>
            Quando você escolhe continuar o atendimento por serviços externos,
            como WhatsApp ou Instagram, o tratamento de dados nesses ambientes
            também segue as políticas das respectivas plataformas.
          </p>
          <h2>Seus direitos</h2>
          <p>
            Solicitações relacionadas a acesso, correção ou exclusão de dados
            podem ser encaminhadas pelos canais oficiais publicados na página de
            contato da Esméra.
          </p>
          <a class="esv-text-link" href="/contato">Ir para contato</a>
        </div>
      </article>
    </StorefrontLayout>
  );
}
