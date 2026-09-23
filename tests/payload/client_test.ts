import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  createPayloadClient,
  getPayloadBaseURL,
  normalizePayloadBaseURL,
  payloadGet,
} from "../../lib/payload/client.ts";
import { PayloadAPIError } from "../../lib/payload/errors.ts";

Deno.test("normalizes the Payload base URL without /api", () => {
  assertEquals(
    normalizePayloadBaseURL("https://cms.example.com/"),
    "https://cms.example.com",
  );
  assertThrows(
    () => normalizePayloadBaseURL("https://cms.example.com/api"),
    PayloadAPIError,
  );
});

Deno.test("prefers PAYLOAD_API_URL from the server environment", () => {
  const previous = Deno.env.get("PAYLOAD_API_URL");
  try {
    Deno.env.set("PAYLOAD_API_URL", "https://cms.example.com/");
    assertEquals(getPayloadBaseURL(), "https://cms.example.com");
  } finally {
    if (previous === undefined) {
      Deno.env.delete("PAYLOAD_API_URL");
    } else {
      Deno.env.set("PAYLOAD_API_URL", previous);
    }
  }
});

Deno.test("uses the public Payload URL when the environment variable is absent", () => {
  const previous = Deno.env.get("PAYLOAD_API_URL");
  try {
    Deno.env.delete("PAYLOAD_API_URL");
    assertEquals(
      getPayloadBaseURL(),
      "https://esmeracms-green.vercel.app",
    );
  } finally {
    if (previous === undefined) {
      Deno.env.delete("PAYLOAD_API_URL");
    } else {
      Deno.env.set("PAYLOAD_API_URL", previous);
    }
  }
});

Deno.test("builds GET requests and parses JSON", async () => {
  let requested = "";
  const result = await payloadGet<{ ok: boolean }>("products", {
    baseURL: "https://cms.example.com",
    depth: 2,
    limit: 12,
    page: 2,
    sort: "title",
    fetcher: (input) => {
      requested = String(input);
      return Promise.resolve(Response.json({ ok: true }));
    },
  });
  assertEquals(result.ok, true);
  assertEquals(
    requested,
    "https://cms.example.com/api/products?depth=2&limit=12&page=2&sort=title",
  );
});

Deno.test("creates a client with reusable base URL and cache defaults", async () => {
  let requested = "";
  let cache: RequestCache | undefined;
  const client = createPayloadClient({
    baseURL: "https://cms.example.com",
    cache: "force-cache",
    dedupe: false,
    fetcher: (input, init) => {
      requested = String(input);
      cache = init?.cache;
      return Promise.resolve(Response.json({ docs: [] }));
    },
  });

  await client.get("products", { limit: 1 });

  assertEquals(requested, "https://cms.example.com/api/products?limit=1");
  assertEquals(cache, "force-cache");
});

Deno.test("classifies HTTP errors with status and a safe endpoint", async () => {
  const error = await assertRejects(
    () =>
      payloadGet("products", {
        baseURL: "https://cms.example.com",
        fetcher: () => Promise.resolve(new Response("no", { status: 500 })),
      }),
    PayloadAPIError,
    "HTTP 500",
  ) as PayloadAPIError;

  assertEquals(error.status, 500);
  assertEquals(error.endpoint, "/api/products");
  assertEquals(error.message.includes("cms.example.com"), false);
});

Deno.test("rejects non-JSON and invalid JSON responses", async () => {
  await assertRejects(
    () =>
      payloadGet("products", {
        baseURL: "https://cms.example.com",
        fetcher: () => Promise.resolve(new Response("not-json")),
      }),
    PayloadAPIError,
    "não retornou JSON",
  );
  await assertRejects(
    () =>
      payloadGet("products", {
        baseURL: "https://cms.example.com",
        fetcher: () =>
          Promise.resolve(
            new Response("{", {
              headers: { "content-type": "application/json" },
            }),
          ),
      }),
    PayloadAPIError,
    "JSON inválido",
  );
});

Deno.test("deduplicates identical in-flight GET requests", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetcher: typeof fetch = async () => {
    calls++;
    await gate;
    return Response.json({ ok: true });
  };
  const options = {
    baseURL: "https://cms.example.com",
    limit: 1,
    fetcher,
  };

  const first = payloadGet<{ ok: boolean }>("products", options);
  const second = payloadGet<{ ok: boolean }>("products", options);
  await Promise.resolve();

  assertEquals(calls, 1);
  release();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assertEquals(firstResult.ok, true);
  assertEquals(secondResult.ok, true);
});

Deno.test("allows in-flight deduplication to be disabled", async () => {
  let calls = 0;
  const fetcher: typeof fetch = () => {
    calls++;
    return Promise.resolve(Response.json({ ok: true }));
  };

  await Promise.all([
    payloadGet("products", {
      baseURL: "https://cms.example.com",
      fetcher,
      dedupe: false,
    }),
    payloadGet("products", {
      baseURL: "https://cms.example.com",
      fetcher,
      dedupe: false,
    }),
  ]);

  assertEquals(calls, 2);
});


Deno.test("can disable transient retries for latency-sensitive requests", async () => {
  let calls = 0;
  const error = await assertRejects(
    () =>
      payloadGet("storefront/bootstrap", {
        baseURL: "https://cms.example.com",
        maxRetries: 0,
        fetcher: () => {
          calls++;
          return Promise.resolve(new Response("unavailable", { status: 503 }));
        },
      }),
    PayloadAPIError,
    "HTTP 503",
  ) as PayloadAPIError;

  assertEquals(calls, 1);
  assertEquals(error.status, 503);
});

Deno.test("aborts slow requests", async () => {
  const error = await assertRejects(
    () =>
      payloadGet("products", {
        baseURL: "https://cms.example.com",
        timeoutMs: 5,
        fetcher: (_input, init) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")))
          ),
      }),
    PayloadAPIError,
    "tempo limite",
  ) as PayloadAPIError;

  assertEquals(error.endpoint, "/api/products");
});
