import { assertEquals } from "@std/assert";
import { storefrontDetailToModalMedia } from "../../lib/esmera/productDetail.ts";
import type { StorefrontProductDetailV2 } from "../../lib/esmera/storefront.ts";

Deno.test("product modal prefers uncropped storefront gallery over 3:4 card crop", () => {
  const detail: StorefrontProductDetailV2 = {
    version: 2,
    revision: "rev-horizontal",
    product: {
      id: "product-1",
      slug: "bandeja-organica",
      title: "Bandeja Orgânica",
      priceUnit: "cent",
      image: {
        id: "card",
        url: "https://cms.example.com/product-card-900x1200.jpg",
        alt: "Bandeja Orgânica",
        width: 900,
        height: 1200,
      },
      gallery: [
        {
          id: "gallery",
          url: "https://cms.example.com/gallery-1800x1200.jpg",
          alt: "Bandeja Orgânica",
          width: 1800,
          height: 1200,
        },
      ],
    },
  };

  const media = storefrontDetailToModalMedia(detail);

  assertEquals(media?.image, "https://cms.example.com/gallery-1800x1200.jpg");
  assertEquals(
    media?.gallery[0].url,
    "https://cms.example.com/gallery-1800x1200.jpg",
  );
  assertEquals(media?.gallery[0].width, 1800);
  assertEquals(media?.gallery[0].height, 1200);
  assertEquals(media?.gallery[0].role, "cover");
});

Deno.test("product modal keeps distinct uncropped gallery images in source order", () => {
  const detail: StorefrontProductDetailV2 = {
    version: 2,
    revision: "rev-gallery",
    product: {
      id: "product-2",
      slug: "objeto-dois",
      title: "Objeto Dois",
      priceUnit: "cent",
      gallery: [
        {
          id: "a",
          url: "https://cms.example.com/a.jpg",
          alt: "A",
          width: 1800,
          height: 1200,
        },
        {
          id: "b",
          url: "https://cms.example.com/b.jpg",
          alt: "B",
          width: 1200,
          height: 1800,
        },
        {
          id: "a-duplicate",
          url: "https://cms.example.com/a.jpg",
          alt: "A repetida",
          width: 1800,
          height: 1200,
        },
      ],
    },
  };

  const media = storefrontDetailToModalMedia(detail);

  assertEquals(media?.gallery.length, 2);
  assertEquals(media?.gallery.map((item) => item.role), ["cover", "detail"]);
  assertEquals(media?.gallery.map((item) => item.url), [
    "https://cms.example.com/a.jpg",
    "https://cms.example.com/b.jpg",
  ]);
});
