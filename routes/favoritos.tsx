import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../components/esmera/StorefrontLayout.tsx";
import FavoritesPage from "../islands/FavoritesPage.tsx";
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

export default function FavoritesRoute({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout
      {...data.chrome}
      canonical={data.canonical}
      seo={{
        title: "Meus Favoritos | Esméra",
        description: "Consulte e organize as peças que você salvou na Esméra.",
        noindex: true,
      }}
    >
      <section class="esv-favorites-page">
        <header class="esv-shell esv-favorites-head">
          <p class="esv-kicker">SUA SELEÇÃO</p>
          <h1>Meus Favoritos</h1>
          <p>
            As peças que você escolheu, reunidas em um só lugar para comparar
            e rever quando quiser.
          </p>
        </header>

        <div class="esv-shell esv-favorites-body">
          <FavoritesPage />
        </div>
      </section>
    </StorefrontLayout>
  );
}
