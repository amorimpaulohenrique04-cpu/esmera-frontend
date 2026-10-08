import { assertEquals } from "@std/assert";
import { sanitizeRequestCookies } from "../../lib/esmera/requestCookies.ts";

Deno.test("malformed segments cannot abort Deco cookie parsing", () => {
  const request = new Request("https://esmera.test/", {
    headers: {
      cookie: "=bad; cart=abc==; invalid name=x; session=valid; broken",
    },
  });
  assertEquals(
    sanitizeRequestCookies(request).headers.get("cookie"),
    "cart=abc==; session=valid",
  );
});
Deno.test("valid requests and cookie values are preserved", () => {
  const request = new Request("https://esmera.test/", {
    headers: { cookie: "session=abc==; cart=123" },
  });
  assertEquals(sanitizeRequestCookies(request), request);
  const empty = sanitizeRequestCookies(
    new Request("https://esmera.test/", { headers: { cookie: "=bad" } }),
  );
  assertEquals(empty.headers.get("cookie"), null);
});
