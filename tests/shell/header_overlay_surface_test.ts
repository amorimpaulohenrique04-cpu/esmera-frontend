import { assertFalse, assertStringIncludes } from "@std/assert";

Deno.test("search and cart overlays preserve the current header surface", async () => {
  const header = await Deno.readTextFile("islands/EsmeraHeader.tsx");

  assertStringIncludes(
    header,
    'type HeaderSurface = "hero" | "solid" | "mega";',
  );
  assertStringIncludes(
    header,
    "const headerSurface: HeaderSurface = megaOpen || desktopMenuHovered",
  );
  assertFalse(header.includes("const headerSurface: HeaderSurface = overlay"));
  assertFalse(header.includes('? "overlay"'));
});
