import { assert, assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("menu navigation starts immediately while an open surface exits", async () => {
  const coordinator = await Deno.readTextFile(
    "islands/MenuNavigationCoordinator.tsx",
  );
  const layout = await Deno.readTextFile(
    "components/esmera/StorefrontLayout.tsx",
  );

  assertStringIncludes(coordinator, "anchor.closest(MENU_SELECTOR)");
  assertStringIncludes(coordinator, "beginMenuExit();");
  assertEquals(coordinator.includes("event.preventDefault()"), false);
  assertEquals(coordinator.includes("location.assign"), false);
  assertEquals(coordinator.includes("MENU_EXIT_MS"), false);
  assertStringIncludes(coordinator, 'mega?.classList.add("is-closing")');
  assertStringIncludes(
    coordinator,
    'drawerBackdrop?.classList.add("is-closing")',
  );
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
