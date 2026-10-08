/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />
/// <reference lib="esnext" />

import { ServerContext } from "$fresh/server.ts";
import config from "./fresh.config.ts";
import manifest from "./fresh.gen.ts";

import { sanitizeRequestCookies } from "./lib/esmera/requestCookies.ts";

// The boundary runs before Fresh/Deco plugins, including their cookie parser.
const context = await ServerContext.fromManifest(manifest, {
  ...config,
  dev: false,
});
const handler = context.handler();
const port = Number(Deno.env.get("PORT") || "8000");
await Deno.serve(
  { port },
  (request, info) => handler(sanitizeRequestCookies(request), info),
).finished;
