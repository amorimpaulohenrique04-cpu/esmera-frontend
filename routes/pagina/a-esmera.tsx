import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../../components/esmera/StorefrontLayout.tsx";
import { toSEO } from "../../lib/payload/adapters.ts";
import { getPageChrome } from "../../lib/payload/pageData.ts";
import type { SEOModel } from "../../lib/payload/types.ts";
import AboutHero from "../../sections/Esmera/About/AboutHero.tsx";
import AboutProcess from "../../sections/Esmera/About/AboutProcess.tsx";
import AboutManifesto from "../../sections/Esmera/About/AboutManifesto.tsx";
import AboutMaterials from "../../sections/Esmera/About/AboutMaterials.tsx";

/**
 * Página institucional dedicada, servida estaticamente em /pagina/a-esmera.
 * O Fresh resolve rotas estáticas antes de [slug].tsx, então esta rota
 * assume a URL sem competir com o handler genérico de páginas editoriais
 * do Payload (que continua servindo as demais páginas em /pagina/:slug).
 * Todo o conteúdo é local ao frontend — nada aqui lê ou grava no Payload.
 */

/**
 * Imagens institucionais selecionadas da pasta oficial da Esméra no Drive.
 * O endpoint de thumbnail mantém uma URL pública de imagem e evita trazer os
 * arquivos originais de 5–8 MB para a página.
 */
const driveImage = (fileId: string, width = 1600) =>
  `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;

const hero = {
  eyebrow: "A ESMÉRA",
  title: "A ESMÉRA",
  text:
    "A Esméra nasce do encontro entre a natureza e o olhar humano. Transformamos pedras naturais e minerais em peças únicas que carregam história, presença e propósito.",
  ctaLabel: "NOSSA ESSÊNCIA",
  ctaHref: "#nossa-essencia",
  image: driveImage("1M_A5C4OqmwVEpWdnhNQ7HHTB3rzOdkdz", 1800),
  imageAlt:
    "Conjunto de peças em pedra verde natural com difusor, porta-sabonete, vaso e bandeja de borda bruta.",
};

const process_ = {
  eyebrow: "NOSSO PROCESSO",
  title: "Da matéria até o produto",
  text:
    "Cada peça percorre um caminho cuidadoso, onde técnica e sensibilidade se encontram para revelar a essência da pedra.",
  steps: [
    {
      number: "01",
      title: "Origem",
      text:
        "Selecionamos pedras e minerais de origem natural, com rastreabilidade e respeito à terra que as formou.",
      image: driveImage("1UHTpescfe8utBZpdxec_p1MoZ6SMQlyK", 1200),
      imageAlt:
        "Placa de pedra verde natural em estado bruto sobre superfície clara.",
    },
    {
      number: "02",
      title: "Transformação",
      text:
        "Lapidamos, esculpimos e polimos cada detalhe com técnicas que valorizam a beleza única de cada material.",
      image: driveImage("1bSXUAWWA97UJZwUJf7eVPnGJnm5jSQxL", 1200),
      imageAlt:
        "Difusor geométrico lapidado em pedra verde, com acabamento polido e varetas.",
    },
    {
      number: "03",
      title: "Registro",
      text:
        "Cada peça é registrada e catalogada, garantindo sua autenticidade e história para quem a escolhe.",
      image: driveImage("1CndBJc3AEsMjll1CW_aQegZy2HVphIcN", 1200),
      imageAlt:
        "Conjunto de difusor e porta-sabonete em pedra clara sobre bandeja, fotografado em fundo neutro.",
    },
  ],
};

const manifesto = {
  eyebrow: "NOSSA ESSÊNCIA",
  text: "Mais do que objetos, criamos presenças que atravessam o tempo.",
  image: driveImage("1bQmWPIxaDirvMZusiUmkvaGFcI85PnFa", 1600),
  imageAlt:
    "Porta-vela em pedra verde entre blocos de mármore, evidenciando veios e texturas naturais.",
};

const materials = {
  eyebrow: "MATERIAIS E CUIDADOS",
  title: "Beleza que permanece",
  image: driveImage("1waOD7WktjjFyV9AwNrBV2kFrf9pOk_10", 1600),
  imageAlt:
    "Vasos de pedra clara com ramos verdes sendo organizados à mão em composição editorial.",
  principles: [
    {
      icon: "stone" as const,
      title: "Pedras naturais",
      text:
        "Materiais únicos, formados pela natureza ao longo de milhões de anos.",
    },
    {
      icon: "handmade" as const,
      title: "Acabamento artesanal",
      text:
        "Cada detalhe recebe acabamento manual para realçar textura, cor e brilho.",
    },
    {
      icon: "care" as const,
      title: "Durabilidade e cuidado",
      text:
        "Instruções simples que preservam a beleza e a integridade da sua peça.",
    },
    {
      icon: "unique" as const,
      title: "Peças únicas",
      text: "Nenhuma pedra é igual à outra. Cada escolha é exclusiva.",
    },
  ],
};

interface Data {
  chrome: Awaited<ReturnType<typeof getPageChrome>>;
  seo: SEOModel;
  canonical: string;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const chrome = await getPageChrome();
    const url = new URL(req.url);
    const baseSeo = toSEO(null, chrome.settings);
    return ctx.render({
      chrome,
      seo: {
        ...baseSeo,
        title: baseSeo.title || "A Esméra",
        description: baseSeo.description || hero.text,
        canonical: `${url.origin}${url.pathname}`,
      },
      canonical: `${url.origin}${url.pathname}`,
    });
  },
};

export default function AboutEsmeraPage({ data }: PageProps<Data>) {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: new URL("/", data.canonical).toString(),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "A Esméra",
        item: data.canonical,
      },
    ],
  };

  return (
    <StorefrontLayout
      {...data.chrome}
      seo={data.seo}
      canonical={data.canonical}
      jsonLd={[breadcrumbJsonLd]}
    >
      <AboutHero {...hero} />
      <div id="nossa-essencia">
        <AboutProcess {...process_} />
      </div>
      <AboutManifesto {...manifesto} />
      <AboutMaterials {...materials} />
    </StorefrontLayout>
  );
}
