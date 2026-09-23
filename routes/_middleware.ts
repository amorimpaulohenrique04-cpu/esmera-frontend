import type { MiddlewareHandlerContext } from "$fresh/server.ts";

const PRODUCTION_HOST = "www.esmeradecor.com.br";

/**
 * Keep browser HTML fresh while giving the production CDN a short, resilient
 * edge TTL. Cloudflare still needs an "Eligible for cache" Cache Rule for HTML;
 * these headers define the origin policy once that rule is active.
 */
export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext,
): Promise<Response> {
  const response = await ctx.next();
  const url = new URL(req.url);
  const contentType = response.headers.get("content-type") ?? "";

  if (
    req.method === "GET" &&
    url.hostname === PRODUCTION_HOST &&
    response.status === 200 &&
    contentType.includes("text/html")
  ) {
    const headers = new Headers(response.headers);
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    headers.set(
      "cloudflare-cdn-cache-control",
      "public, max-age=60, stale-while-revalidate=300, stale-if-error=86400",
    );
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}
