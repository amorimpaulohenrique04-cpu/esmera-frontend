import { assert, assertEquals, assertFalse, assertStringIncludes } from "@std/assert";

Deno.test("product card stylesheet is the only owner of card presentation", async () => {
  const [catalog, finish, master, homeArt, card, app, component, buyButton, header] =
    await Promise.all([
      Deno.readTextFile("static/esmera-catalog-v2.css"),
      Deno.readTextFile("static/esmera-finish.css"),
      Deno.readTextFile("static/esmera-master.css"),
      Deno.readTextFile("static/esmera-home-art-direction-v2.css"),
      Deno.readTextFile("static/esmera-product-card.css"),
      Deno.readTextFile("routes/_app.tsx"),
      Deno.readTextFile("components/esmera/ObjectCard.tsx"),
      Deno.readTextFile("islands/BuyButton.tsx"),
      Deno.readTextFile("islands/EsmeraHeader.tsx"),
    ]);

  for (const legacy of [catalog, finish, master]) {
    assertFalse(legacy.includes(".esv-product-card"));
    assertFalse(legacy.includes(".esv-product-card-copy"));
  }
  assertFalse(finish.includes(".esv-product-actions button"));
  assertFalse(/(^|,)\s*\.esv-product-actions button/m.test(master));

  assertStringIncludes(
    card,
    ".esv-collection-v2-grid > .esv-product-card",
  );
  assertStringIncludes(card, ".esv-product-shelf > .esv-product-card");
  assertStringIncludes(card, ".esv-collection-v2-grid .esv-card-cta");
  assertStringIncludes(card, ".esv-product-shelf .esv-card-cta");
  assertStringIncludes(card, 'font-family: "Inter", sans-serif');
  assertStringIncludes(card, "aspect-ratio: 3 / 2;");
  assertFalse(card.includes("aspect-ratio: 3 / 4;"));
  assertFalse(card.includes("aspect-ratio: 3 / 2 !important"));
  assertStringIncludes(card, ".esv-product-card .esv-product-media > img");
  assertStringIncludes(card, "object-fit: contain");
  assertStringIncludes(card, "object-position: center");
  assertFalse(card.includes("object-fit: cover"));
  assertFalse(card.includes("scale(1.025)"));
  assertStringIncludes(
    card,
    "grid-template-columns: repeat(3, minmax(0, 1fr))",
  );
  assertStringIncludes(card, ".esv-card-value-row");
  assertStringIncludes(card, ".esv-card-installment");
  assertStringIncludes(card, ".esv-card-action-slot");
  assertStringIncludes(card, ".esv-product-card-copy");
  assertStringIncludes(card, "z-index: 3;");
  assertStringIncludes(card, ".esv-product-card:hover .esv-card-wishlist");
  assertStringIncludes(card, "@media (max-width: 639px)");
  assertStringIncludes(card, "height: 2.34em");
  assertStringIncludes(card, ".esv-product-actions.is-emphasized");
  assertStringIncludes(card, "background: transparent");
  assertFalse(card.includes("border-top: 1px solid var(--product-card-line)"));

  assertStringIncludes(card, ".esv-product-card .esv-product-image-detail");
  assertStringIncludes(card, "opacity: 0;");
  assertStringIncludes(
    card,
    ".esv-product-card.has-detail:hover .esv-product-image-primary",
  );
  assertStringIncludes(
    card,
    ".esv-product-card.has-detail:hover .esv-product-image-detail",
  );
  assertFalse(master.includes(".esv-product-media img"));
  assertFalse(homeArt.includes("aspect-ratio: 3 / 2 !important"));
  assertFalse(homeArt.includes("object-fit: contain !important"));
  assertFalse(homeArt.includes(".esv-selected .esv-product-card .esv-product-media img"));
  assertStringIncludes(card, "@media (prefers-reduced-motion: reduce)");
  assertStringIncludes(card, ".esv-product-card .esv-product-media > img");

  assertStringIncludes(component, 'class="esv-card-installment"');
  assertFalse(component.includes("containClass"));
  assertFalse(component.includes("is-media-contain"));
  assertFalse(component.includes("style={{ aspectRatio"));
  assertFalse(component.includes("compactCardStatus"));
  assertStringIncludes(component, 'vm.status.includes("SOB ENCOMENDA")');
  assertStringIncludes(component, "width={1200}");
  assertStringIncludes(component, "height={800}");
  assertStringIncludes(
    component,
    "text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400",
  );
  assertStringIncludes(component, 'class="esv-card-value-row"');
  assertStringIncludes(component, 'class="esv-card-action-slot"');
  assertStringIncludes(
    component,
    'class={`esv-product-card${vm.hoverImage ? " has-detail" : ""}`}',
  );
  assertStringIncludes(component, '"esv-product-image-primary"');
  assertStringIncludes(component, 'class="esv-product-image-detail"');
  assertStringIncludes(component, "vm.hoverImage &&");
  assertStringIncludes(component, 'alt=""');
  assertStringIncludes(component, 'preserveOriginal');
  assertEquals(component.split("preserveOriginal").length - 1, 2);
  assertStringIncludes(component, 'from "../../islands/BuyButton.tsx"');
  assertFalse(component.includes('class="esv-card-footer"'));

  assertStringIncludes(buyButton, 'new CustomEvent("esmera:add-to-enquiry"');
  assertStringIncludes(header, 'openOverlay("enquiry")');

  const cardIndex = app.indexOf(
    "/esmera-product-card.css?v=${productCardStyleRevision}",
  );
  const headerIndex = app.indexOf("/esmera-header.css");
  assert(cardIndex > headerIndex);
  assertStringIncludes(app, 'const productCardStyleRevision = "');
});
