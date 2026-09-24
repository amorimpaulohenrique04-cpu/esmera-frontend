import type { Handlers } from "$fresh/server.ts";

const UPSTREAM_FONT = "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.3.0/latin-300-normal.woff2";

export const handler: Handlers = {
  async GET() {
    const upstream = await fetch(UPSTREAM_FONT, {
      headers: { accept: "font/woff2,*/*;q=0.8" },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("Font unavailable", {
        status: 502,
        headers: { "cache-control": "no-store" },
      });
    }

    return new Response(upstream.body, {
      headers: {
        "content-type": "font/woff2",
        "cache-control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
        "access-control-allow-origin": "*",
      },
    });
  },
};
