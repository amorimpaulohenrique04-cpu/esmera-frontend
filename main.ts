/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />
/// <reference lib="esnext" />

import { createHandler } from "$fresh/server.ts";
import config from "./fresh.config.ts";
import manifest from "./fresh.gen.ts";

import { sanitizeRequestCookies } from "./lib/esmera/requestCookies.ts";

// The boundary runs before Fresh/Deco plugins, including their cookie parser.
const handler = await createHandler(manifest, { ...config, dev: false });
const port = Number(Deno.env.get("PORT") || "8000");
await Deno.serve(
  { port },
  (request, info) => handler(sanitizeRequestCookies(request), info),
).finished;
