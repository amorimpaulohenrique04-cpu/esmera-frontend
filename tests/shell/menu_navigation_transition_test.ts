import { assert, assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("menu navigation waits for an open surface to exit before changing documents", async () => {
  const coordinator = await Deno.readTextFile(
    "islands/MenuNavigationCoordinator.tsx",
  );
  const layout = await Deno.readTextFile(
    "components/esmera/StorefrontLayout.tsx",
  );

  assertStringIncludes(coordinator, "const MENU_EXIT_MS = 220;");
  assertStringIncludes(coordinator, "anchor.closest(MENU_SELECTOR)");
  assertStringIncludes(coordinator, 'mega?.classList.add("is-closing")');
  assertStringIncludes(
    coordinator,
    'drawerBackdrop?.classList.add("is-closing")',
  );
  assertStringIncludes(coordinator, "if (!beginMenuExit()) return;");
  assertStringIncludes(coordinator, "event.preventDefault();");
  assertStringIncludes(
    coordinator,
    "() => globalThis.location.assign(url.href)",
  );
  assertStringIncludes(coordinator, "reduceMotion ? 0 : MENU_EXIT_MS");
  assertStringIncludes(
    coordinator,
    'document.addEventListener("click", onClick, true)',
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
  assert(coordinatorIndex >= 0 && headerIndex > coordinatorIndex);
});
