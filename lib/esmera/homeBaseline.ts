import type { Props as FooterProps } from "../../sections/Esmera/Footer.tsx";
import type { Props as HeroProps } from "../../sections/Esmera/Hero.tsx";
import type { Props as ManifestoProps } from "../../sections/Esmera/Manifesto.tsx";
import type { Props as MatterProps } from "../../sections/Esmera/Matter.tsx";
import type { Props as MatterInterludeProps } from "../../sections/Esmera/MatterInterlude.tsx";
import type { Props as PrivateInvitationProps } from "../../sections/Esmera/PrivateInvitation.tsx";
import type { Props as ProvenanceProps } from "../../sections/Esmera/Provenance.tsx";
import type { Props as SelectedObjectsProps } from "../../sections/Esmera/SelectedObjects.tsx";
import type { Props as SignatureObjectProps } from "../../sections/Esmera/SignatureObject.tsx";
import type { NavigationLink } from "../payload/types.ts";

export interface HomeHeaderBaseline {
  logo?: string;
  enquiryLabel?: string;
  navigation?: NavigationLink[];
  categories?: NavigationLink[];
  whatsappHref?: string;
}

export interface HomeBaseline {
  header: HomeHeaderBaseline;
  hero: HeroProps;
  manifesto: ManifestoProps;
  selectedObjects: SelectedObjectsProps;
  matter: MatterProps;
  signature: SignatureObjectProps[];
  matterInterlude: MatterInterludeProps;
  provenance: ProvenanceProps;
  privateInvitation: PrivateInvitationProps;
  footer: FooterProps;
}

const defaultWhatsAppNumber = "5574981400140";
const defaultEmail = "Esmera.decor@hotmail.com";
const defaultWhatsAppHref = `https://wa.me/${defaultWhatsAppNumber}?text=${
  encodeURIComponent("Olá, gostaria de falar com a Esméra.")
}`;

export const defaultHome: HomeBaseline = {
  header: {
    logo: "ESMÉRA",
    enquiryLabel: "Carrinho",
    navigation: [
      { label: "Seleção", href: "#selection", external: false },
      { label: "Objetos", href: "#objects", external: false },
      { label: "Maison", href: "#about", external: false },
    ],
    categories: [],
    whatsappHref: defaultWhatsAppHref,
  },
  hero: {
    mode: "single",
    slides: [
      {
        desktopImage:
          "https://decoims.com/testeesmera/686e4503-8062-4516-8072-393ca6d3db59/9c7240e1-7977-4baa-bcc1-dd0373c3d538.png",
        mobileImage:
          "https://decoims.com/testeesmera/5ab135ff-8940-4ab4-ad5d-3977997b2297/ba4f8b3d-9ebb-42a3-a066-69ad194e1302.png",
        alt: "Ambiente Esméra com composição mineral verde e mobiliário claro",
        statement: "Matéria rara.\nForma destinada a permanecer.",
        cta: {
          label: "Descobrir a seleção",
          href: "#selection",
          external: false,
        },
      },
    ],
    autoplay: false,
    autoplaySeconds: 6,
    overlay: 20,
    focalPoint: "center",
  },
  manifesto: {
    eyebrow: "02 — A Maison",
    title: "Rara por\nnatureza.\nEscolhida para\npermanecer.",
    text:
      "A Esméra reúne objetos de presença singular, criados ou selecionados a partir de matérias preciosas e concebidos para atravessar o tempo.",
    ctaLabel: "Descobrir a seleção",
    ctaHref: "#selection",
    mainImage:
      "https://decoims.com/testeesmera/210b80ad-b013-4644-b92b-d240a2bbc7c7/ChatGPT-Image-30-de-jul.-de-2026-10_37_48.png",
    mainImageAlt: "Superfície verde mineral em composição editorial",
    secondaryImage:
      "https://decoims.com/testeesmera/903b6444-0e90-4701-957d-6c512ce98065/c8409492-1d48-4c5c-aa3f-4242cc5f921e.png",
    secondaryImageAlt: "Fragmento de matéria mineral verde",
  },
  selectedObjects: {
    eyebrow: "03 — Seleção",
    title: "Objetos de\npresença singular.",
    text:
      "Uma seleção curta de obras disponíveis, reunidas por matéria, presença e permanência.",
    products: [],
    collectionLabel: "Ver coleção",
    collectionHref: "/colecao",
  },
  matter: {
    panels: [
      {
        eyebrow: "ESCULTURAS",
        title: "Presença mineral.",
        text:
          "Formas únicas, esculpidas para ocupar o espaço com força e silêncio.",
        alt: "Escultura mineral verde em ambiente escuro",
        image:
          "https://decoims.com/testeesmera/f327ff15-ee22-4f0d-88fa-2ea2d0c5902e/2c771635-91e2-4cd5-828c-82e0e51b2bf2.png",
      },
      {
        eyebrow: "VASOS",
        title: "Forma em silêncio.",
        text: "Volumes onde matéria, proporção e gesto encontram equilíbrio.",
        alt: "Vaso verde escultórico em composição clara",
        image:
          "https://decoims.com/testeesmera/1ea77b66-e33a-40a4-92a7-0ce4e1514195/f99f23c3-d185-4854-9a86-e0c303b13e04.png",
      },
      {
        eyebrow: "BANDEJAS",
        title: "Forma que organiza",
        text: "Peças funcionais tratadas como objetos de coleção.",
        alt: "Bandeja mineral em composição editorial",
        image:
          "https://decoims.com/testeesmera/fc9860b6-3514-48c2-821c-61444daa01b2/3e4c1bba-a50a-4d50-9f1b-6485ae17b28a.png",
      },
    ],
  },
  signature: [],
  matterInterlude: {
    title: "Formada lentamente.\nTransformada uma vez.",
    material: "esmeralda",
    image:
      "https://decoims.com/testeesmera/0eb6ebf2-58bd-44d6-a226-fcc452bcd9fc/IMG_3638.jpg",
    imageAlt:
      "Composição mineral com pedra azul, vaso claro e pequeno pássaro dourado",
    focalPoint: "center",
  },
  provenance: {
    eyebrow: "07 — Proveniência",
    title: "Da origem\nao registro.",
    text:
      "Proveniência não é um benefício adicionado depois da escolha. É parte da forma como a obra é apresentada, compreendida e adquirida.",
    stages: [
      {
        title: "Origem",
        text:
          "A ficha individual declara matéria principal, características naturais e origem quando a informação é verificável.",
        image:
          "https://decoims.com/testeesmera/3c463c46-d9c4-4e2a-bea9-ceb125640b9c/b5a33f15-2fb6-48ec-a766-8bbbeddf16a4.png",
        alt: "Esmeralda bruta apresentada sobre base clara",
      },
      {
        title: "Transformação",
        text:
          "Acabamento, montagem, variações de superfície e gesto construtivo são registrados como parte da leitura da peça.",
        image:
          "https://decoims.com/testeesmera/6a6dc32a-cb81-4ba9-966a-ca95b6c19bc6/88e1fa11-803e-4e58-838d-8192dca72afd.png",
        alt: "Detalhe de quadro mineral verde em transformação",
      },
      {
        title: "Registro",
        text:
          "Status de peça única ou edição, documentação e registro fotográfico acompanham a apresentação e a consulta.",
        image:
          "https://decoims.com/testeesmera/ef4ff38f-f74b-49c2-918c-cfacafb9820f/e31edf3a-ce06-4564-a8a0-84c1ec5e1602.png",
        alt: "Peça mineral concluída sobre pedestal claro",
      },
    ],
  },
  privateInvitation: {
    eyebrow: "08 — Atendimento Exclusivo",
    title: "Uma peça pode começar com uma ideia.",
    text:
      "Para projetos especiais, desenvolvemos criações sob encomenda a partir da necessidade, do espaço e da matéria.\n\nDo desenho à escolha da pedra, cada detalhe pode ser pensado para criar uma peça que tenha sentido naquele lugar.",
    ctaLabel: "Converse com a Esméra sobre seu projeto.",
    ctaHref:
      `mailto:${defaultEmail}?subject=Consulta%20privada%20%E2%80%94%20Esm%C3%A9ra`,
  },
  footer: {
    siteName: "ESMÉRA",
    statement: "Natureza. Matéria. Permanência.",
    contactLabel: defaultEmail,
    contactHref: `mailto:${defaultEmail}`,
    privacyLabel: "Privacidade",
    privacyHref: "#contact",
    termsLabel: "Termos",
    termsHref: "#contact",
    location: "Brasil",
    whatsappLabel: "WhatsApp",
    whatsappHref: defaultWhatsAppHref,
  },
};
