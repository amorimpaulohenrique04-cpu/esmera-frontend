/** Drop malformed cookie segments before Deco's strict cookie parser runs. */
export function sanitizeRequestCookies(request: Request): Request {
  const cookie = request.headers.get("cookie");
  if (!cookie) return request;
  const valid = cookie.split(";").filter((segment) => {
    const separator = segment.indexOf("=");
    if (separator < 1) return false;
    const name = segment.slice(0, separator).trim();
    return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name);
  }).map((segment) => segment.trim()).join("; ");
  if (valid === cookie) return request;
  const headers = new Headers(request.headers);
  if (valid) headers.set("cookie", valid);
  else headers.delete("cookie");
  return new Request(request, { headers });
}
