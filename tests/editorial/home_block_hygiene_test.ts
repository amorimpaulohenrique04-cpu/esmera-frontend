import { assert, assertEquals, assertStringIncludes } from "@std/assert";

function emptyObjectPaths(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      emptyObjectPaths(item, `${path}.${index}`)
    );
  }
  if (!value || typeof value !== "object") return [];

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return [path];
  return entries.flatMap(([key, item]) =>
    emptyObjectPaths(item, `${path}.${key}`)
  );
}

Deno.test("Home block does not persist empty or incomplete object overrides", async () => {
  const source = await Deno.readTextFile(".deco/blocks/pages-home.json");
  const block = JSON.parse(source) as {
    sections?: Array<Record<string, unknown>>;
  };

  assertEquals(emptyObjectPaths(block), []);

  const selectedObjects = block.sections?.find((section) =>
    section.__resolveType === "site/sections/Esmera/SelectedObjects.tsx"
  );
  const signature = block.sections?.find((section) =>
    section.__resolveType === "site/sections/Esmera/SignatureObject.tsx"
  );

  assertEquals(Object.hasOwn(selectedObjects || {}, "products"), false);
  assertEquals(Object.hasOwn(signature || {}, "product"), false);
});

Deno.test("Home has no legacy scroll-scene coordinator or scene hooks", async () => {
  const header = await Deno.readTextFile("sections/Esmera/Header.tsx");
  const hero = await Deno.readTextFile("sections/Esmera/Hero.tsx");
  const carousel = await Deno.readTextFile("islands/HeroCarousel.tsx");
  const manifesto = await Deno.readTextFile("sections/Esmera/Manifesto.tsx");
  const matter = await Deno.readTextFile("sections/Esmera/Matter.tsx");
  const interlude = await Deno.readTextFile(
    "sections/Esmera/MatterInterlude.tsx",
  );
  const freshManifest = await Deno.readTextFile("fresh.gen.ts");
  const motion = await Deno.readTextFile("static/esmera-motion-v2.css");
  const matterStyles = await Deno.readTextFile(
    "static/esmera-matter-interaction.css",
  );
  const app = await Deno.readTextFile("routes/_app.tsx");

  for (const source of [header, freshManifest]) {
    assertEquals(source.includes("EsmeraScrollScenes"), false);
  }
  assertEquals(freshManifest.includes("SpatialMatter"), false);
  for (const source of [hero, manifesto, matter, interlude]) {
    assertEquals(source.includes("data-motion-scene"), false);
  }

  assertEquals(hero.includes('id="main-content"'), false);
  assertEquals(carousel.includes('id="main-content"'), false);
  assertEquals(motion.includes("--esv-hero-y"), false);
  assertEquals(motion.includes(".esv-maison-scene"), false);
  assertEquals(motion.includes("--esv-interlude-y"), false);
  assertEquals(motion.includes("position: sticky"), false);
  assertEquals(matterStyles.includes("esv-scenes-ready"), false);
  assertEquals(matterStyles.includes("is-active"), false);
  assertEquals(app.includes("esmera-structure-guard.css"), false);

  assertStringIncludes(app, 'const storefrontStyleRevision = "');
  assertStringIncludes(app, 'const homeStyleRevision = "');
  assertStringIncludes(
    app,
    "/esmera-motion-v2.css?v=${homeStyleRevision}",
  );
  assertStringIncludes(
    app,
    "/esmera-matter-interaction.css?v=${homeStyleRevision}",
  );
});

Deno.test("Home keeps main-content and signature ids unique by construction", async () => {
  const layout = await Deno.readTextFile(
    "components/esmera/StorefrontLayout.tsx",
  );
  const signature = await Deno.readTextFile(
    "sections/Esmera/SignatureObject.tsx",
  );
  const payloadHome = await Deno.readTextFile(
    "sections/Esmera/PayloadHome.tsx",
  );

  assertStringIncludes(layout, '<main id="main-content">');
  assertEquals(signature.includes('id="signature"'), false);
  assertEquals(signature.includes('id="esv-signature-title"'), false);
  assertStringIncludes(signature, "const sectionId = `signature-${domToken}`;");
  assertStringIncludes(
    payloadHome,
    'instanceKey={`${slide.product?.id ?? "signature"}-${index}`}',
  );
});

Deno.test("P2 accessibility keeps collection headings, landmarks and WhatsApp affordance", async () => {
  const collection = await Deno.readTextFile("sections/Esmera/Collection.tsx");
  const header = await Deno.readTextFile("sections/Esmera/Header.tsx");
  const footer = await Deno.readTextFile("sections/Esmera/Footer.tsx");
  const accessibilityCss = await Deno.readTextFile(
    "static/esmera-accessibility-p1-v1.css",
  );

  const h1 = collection.indexOf('<h1 id="esv-collection-title">');
  const h2 = collection.indexOf(
    '<h2 class="esv-sr-only">Peças da coleção</h2>',
  );
  const explorer = collection.indexOf("<CollectionExplorer");
  assert(h1 >= 0 && h2 > h1 && explorer > h2);

  assertStringIncludes(
    header,
    '<nav class="esv-skip-landmark" aria-label="Acessibilidade">',
  );
  assertStringIncludes(
    header,
    '<a class="esv-skip" href="#main-content">Pular para o conteúdo</a>',
  );

  assertStringIncludes(
    footer,
    'import Icon from "../../components/ui/Icon.tsx";',
  );
  assertStringIncludes(
    footer,
    '<Icon id="WhatsApp" size={18} aria-hidden="true" />',
  );
  assertStringIncludes(
    footer,
    'aria-label="Falar com a Esméra no WhatsApp"',
  );
  assertStringIncludes(accessibilityCss, ".esv-whatsapp-sticky > svg");
  assertStringIncludes(accessibilityCss, "width: 20px;");
  assertStringIncludes(accessibilityCss, "height: 20px;");
});
