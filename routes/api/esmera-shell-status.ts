import type { Handlers } from "$fresh/server.ts";
import { storefrontShellStatus } from "../../loaders/Esmera/StorefrontPageData.ts";

/**
 * Read-only diagnostic of the menu/bootstrap snapshot held by this instance:
 * which CMS revision it serves, how old it is and why the last refresh failed.
 * It exposes no content, credentials or error messages.
 */
export const handler: Handlers = {
  GET() {
    return Response.json(storefrontShellStatus(), {
      headers: { "cache-control": "no-store" },
    });
  },
};
