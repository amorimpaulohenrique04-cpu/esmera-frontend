import { assertEquals } from "@std/assert";
import { resolveShell } from "../../lib/esmera/shellData.ts";
import type { PayloadNavigation } from "../../lib/payload/types.ts";

Deno.test("shell always exposes HOME as the first desktop/mobile menu item", () => {
  const shell = resolveShell(null, null, []);
  assertEquals(shell.menu[0]?.label, "HOME");
  assertEquals(shell.menu[0]?.href, "/");
  assertEquals(shell.navigation[0]?.label, "HOME");
  assertEquals(shell.navigation[0]?.href, "/");
});

Deno.test("shell does not duplicate HOME when CMS already provides it", () => {
  const navigation: PayloadNavigation = {
    mainLinks: [
      { label: "HOME", href: "/", kind: "internal", active: true },
      { label: "PEÇAS", href: "/colecao", kind: "internal", active: true },
    ],
  };
  const shell = resolveShell(navigation, null, []);
  assertEquals(shell.menu.filter((item) => item.href === "/").length, 1);
  assertEquals(shell.navigation.filter((item) => item.href === "/").length, 1);
});

Deno.test("shell keeps brand, footer and SEO usable when CMS globals are empty", () => {
  const shell = resolveShell(null, null, []);
  assertEquals(shell.siteName, "ESMÉRA");
  assertEquals(shell.footer.siteName, "ESMÉRA");
  assertEquals(shell.footer.privacyHref, "/politica-de-privacidade");
  assertEquals(shell.footer.termsHref, "/termos");
  assertEquals(shell.instagramHref, "https://instagram.com/esmera.decor");
  assertEquals(shell.defaultSEO.title, "ESMÉRA");
});
