import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("menu navigation waits for the owned exit lifecycle before routing", async () => {
  const coordinator = await Deno.readTextFile(
    "lib/esmera/useMenuNavigationCoordinator.ts",
  );
  const menu = await Deno.readTextFile("islands/DynamicMenu.tsx");
  const header = await Deno.readTextFile("islands/EsmeraHeader.tsx");

  assertStringIncludes(coordinator, "anchor.closest(MENU_SELECTOR)");
  assertStringIncludes(coordinator, "hasActiveMenuSurface()");
  assertStringIncludes(coordinator, "prefersReducedMotion()");
  assertStringIncludes(coordinator, "event.preventDefault()");
  assertStringIncludes(coordinator, "MENU_NAVIGATION_FALLBACK_MS");
  assertStringIncludes(coordinator, "globalThis.location.assign(url.href)");
  assertStringIncludes(
    coordinator,
    "new CustomEvent(MENU_NAVIGATION_REQUEST_EVENT",
  );
  assertStringIncludes(
    coordinator,
    'surface.classList.add("is-closing")',
  );
  assertEquals(menu.includes('.classList.add("is-closing")'), false);

  assertStringIncludes(
    menu,
    'from "../lib/esmera/navigationMotion.ts"',
  );
  assertStringIncludes(
    coordinator,
    'from "./navigationMotion.ts"',
  );
  assertStringIncludes(menu, "megaAfterClose");
  assertStringIncludes(menu, "drawerAfterClose");
  assertStringIncludes(menu, "requestDesktopClose(navigate)");
  assertStringIncludes(menu, "requestMobileClose(navigate)");
  assertStringIncludes(
    menu,
    'if (megaPhase === "closing" || megaExitTimer.current) return;',
  );
  assertStringIncludes(
    menu,
    "if (drawerExitTimer.current) return;",
  );
  assertEquals(menu.includes("handleMobileNavigation"), false);

  assertStringIncludes(coordinator, "event.metaKey");
  assertStringIncludes(coordinator, "event.ctrlKey");
  assertStringIncludes(coordinator, 'anchor.hasAttribute("download")');
  assertStringIncludes(coordinator, 'anchor.target !== "_self"');
  assertStringIncludes(coordinator, "isSameDocumentHash(url)");

  assertStringIncludes(
    header,
    'import { useMenuNavigationCoordinator } from "../lib/esmera/useMenuNavigationCoordinator.ts";',
  );
  assertStringIncludes(header, "useMenuNavigationCoordinator();");
});
