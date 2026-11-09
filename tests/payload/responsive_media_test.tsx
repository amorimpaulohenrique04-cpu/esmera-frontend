import {
  assert,
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "@std/assert";
import { render } from "preact-render-to-string";
import {
  EsmeraImage,
  EsmeraPicture,
  isPayloadMediaURL,
  optimizePayloadMediaURL,
  payloadMediaSrcSet,
} from "../../components/esmera/ResponsiveMedia.tsx";

const payloadDesktop =
  "https://esmeracms-green.vercel.app/api/media/file/Sem%20T%C3%ADtulo-5-900x1125.jpg";
const payloadMobile =
  "https://esmeracms-green.vercel.app/api/media/file/Sem%20T%C3%ADtulo-5-320x320.jpg";

Deno.test("recognizes Payload media routes independently of the CMS host", () => {
  assert(isPayloadMediaURL(payloadDesktop));
  assert(
    isPayloadMediaURL(
      "https://cms.esmera.com.br/api/media/file/produto-card.jpg",
    ),
  );
  assertFalse(isPayloadMediaURL("https://decoims.com/testeesmera/image.jpg"));
  assertFalse(isPayloadMediaURL("https://example.com/catalog/product.jpg"));
  assertFalse(isPayloadMediaURL("not-a-url"));
});

Deno.test("renders CMS images through WebP variants without a quota-dependent proxy", () => {
  const html = render(
    <EsmeraImage
      src={payloadDesktop}
      alt="Produto Esméra"
      width={960}
      height={1200}
      sizes="24vw"
    />,
  );

  assertStringIncludes(
    html,
    `src="${
      optimizePayloadMediaURL(payloadDesktop, 960).replaceAll("&", "&amp;")
    }"`,
  );
  assertStringIncludes(html, 'alt="Produto Esméra"');
  assertStringIncludes(
    html,
    "/api/media/variant/1200/Sem%20T%C3%ADtulo-5-900x1125.jpg",
  );
  assertStringIncludes(html, " 480w");
  assertFalse(html.includes("decoims.com/image"));
  assertFalse(html.includes("/_next/image"));
});

Deno.test("leaves URLs outside the CMS media route untouched", () => {
  const other = "https://example.com/catalog/product.jpg";
  assertEquals(optimizePayloadMediaURL(other, 800), other);
  assertEquals(payloadMediaSrcSet(other, 800), "");
});

Deno.test("never asks the CMS for a width it does not accept", () => {
  const srcset = payloadMediaSrcSet(payloadDesktop, 3840);
  assertEquals(
    [...srcset.matchAll(/variant\/(\d+)\//g)].map((match) => match[1]),
    ["480", "800", "1200", "1600", "2000"],
  );
  assertStringIncludes(optimizePayloadMediaURL(payloadDesktop, 500), "/800/");
});

Deno.test("renders Payload picture sources directly for mobile and desktop", () => {
  const html = render(
    <EsmeraPicture
      desktopSrc={payloadDesktop}
      mobileSrc={payloadMobile}
      alt="Hero Esméra"
      desktopWidth={1920}
      desktopHeight={1080}
      mobileWidth={768}
      mobileHeight={1024}
    />,
  );

  assertStringIncludes(
    html,
    "/api/media/variant/800/Sem%20T%C3%ADtulo-5-320x320.jpg 800w",
  );
  assertStringIncludes(
    html,
    "/api/media/variant/2000/Sem%20T%C3%ADtulo-5-900x1125.jpg 2000w",
  );
  assertStringIncludes(
    html,
    `src="${
      optimizePayloadMediaURL(payloadDesktop, 1920).replaceAll("&", "&amp;")
    }"`,
  );
  assertFalse(html.includes("decoims.com/image"));
  assertFalse(html.includes("/_next/image"));
});

Deno.test("keeps Deco optimization for native Deco assets", () => {
  const decoAsset = "https://decoims.com/testeesmera/catalog/product.jpg";
  const html = render(
    <EsmeraImage
      src={decoAsset}
      alt="Asset Deco"
      width={960}
      height={1200}
    />,
  );

  assertEquals(isPayloadMediaURL(decoAsset), false);
  assertStringIncludes(html, "decoims.com/image");
});
