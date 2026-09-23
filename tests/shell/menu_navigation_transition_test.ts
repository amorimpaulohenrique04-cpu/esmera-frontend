import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("menu navigation waits for the owned exit lifecycle before routing", async () => {
  const coordinator = await Deno.readTextFile(
    "islands/MenuNavigationCoordinator.tsx",
  );
  const menu = await Deno.readTextFile("islands/DynamicMenu.tsx");
  const layout = await Deno.readTextFile(
    "components/esmera/StorefrontLayout.tsx",
  );

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
  assertEquals(coordinator.includes('.classList.add("is-closing")'), false);

  assertStringIncludes(
    menu,
    'from "../lib/esmera/navigationMotion.ts"',
  );
  assertStringIncludes(
    coordinator,
    'from "../lib/esmera/navigationMotion.ts"',
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
    'if (drawerPhase === "closing" || drawerExitTimer.current) return;',
  );

  assertStringIncludes(coordinator, "event.metaKey");
  assertStringIncludes(coordinator, "event.ctrlKey");
  assertStringIncludes(coordinator, 'anchor.hasAttribute("download")');
  assertStringIncludes(coordinator, 'anchor.target !== "_self"');
  assertStringIncludes(coordinator, "isSameDocumentHash(url)");

  assertStringIncludes(
    layout,
    'import MenuNavigationCoordinator from "../../islands/MenuNavigationCoordinator.tsx";',
  );
  assertEquals(
    layout.match(/<MenuNavigationCoordinator \/>/g)?.length ?? 0,
    1,
  );

  const coordinatorIndex = layout.indexOf("<MenuNavigationCoordinator />");
  const headerIndex = layout.indexOf("<Header");
  assertEquals(coordinatorIndex >= 0 && headerIndex > coordinatorIndex, true);
});
