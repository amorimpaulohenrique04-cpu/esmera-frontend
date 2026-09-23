import { assertEquals, assertStringIncludes } from "@std/assert";

const ROUTE_MOTION_TOKENS = [
  "@view-transition",
  "::view-transition",
  "view-transition-name",
  "esv-page-out",
  "esv-page-in",
];

Deno.test("route-transition CSS has a single canonical owner", async () => {
  const owners = new Set<string>();

  for await (const entry of Deno.readDir("static")) {
    if (!entry.isFile || !entry.name.endsWith(".css")) continue;
    const path = `static/${entry.name}`;
    const css = await Deno.readTextFile(path);
    if (ROUTE_MOTION_TOKENS.some((token) => css.includes(token))) {
      owners.add(path);
    }
  }

  assertEquals([...owners].sort(), ["static/esmera-motion-v2.css"]);

  for (
    const path of [
      "static/esmera-header.css",
      "static/esmera-catalog-v2.css",
      "static/esmera-mobile-recovery-v4.css",
      "static/esmera-shell-cro-v1.css",
    ]
  ) {
    const css = await Deno.readTextFile(path);
    for (const token of ROUTE_MOTION_TOKENS) {
      assertEquals(
        css.includes(token),
        false,
        `${path} must not own route motion token: ${token}`,
      );
    }
  }
});

Deno.test("menu lifecycle motion is not duplicated in the catalog layer", async () => {
  const catalog = await Deno.readTextFile("static/esmera-catalog-v2.css");
  const header = await Deno.readTextFile("static/esmera-header.css");
  const motion = await Deno.readTextFile("static/esmera-motion-v2.css");

  assertEquals(catalog.includes("animation:esv-mega-v2-in"), false);
  assertEquals(catalog.includes("animation:esv-overlay-in"), false);
  assertEquals(catalog.includes("animation:esv-panel-in-left"), false);

  assertStringIncludes(header, "animation: esv-mega-v2-in");
  assertStringIncludes(header, "animation: esv-overlay-in");
  assertStringIncludes(header, "animation: esv-panel-in-left");

  assertStringIncludes(motion, ".esv-mega-v2.is-closing");
  assertStringIncludes(motion, ".esv-nav-v2-backdrop.is-closing");
  assertStringIncludes(motion, "@keyframes esv-mega-out");
  assertStringIncludes(motion, "@keyframes esv-drawer-out");
});

Deno.test("menu navigation event contract has one source of truth", async () => {
  const contract = await Deno.readTextFile("lib/esmera/navigationMotion.ts");
  const coordinator = await Deno.readTextFile(
    "islands/MenuNavigationCoordinator.tsx",
  );
  const menu = await Deno.readTextFile("islands/DynamicMenu.tsx");

  assertStringIncludes(
    contract,
    '"esmera:menu-navigation-request"',
  );
  assertStringIncludes(
    coordinator,
    'from "../lib/esmera/navigationMotion.ts"',
  );
  assertStringIncludes(
    menu,
    'from "../lib/esmera/navigationMotion.ts"',
  );

  assertEquals(
    coordinator.includes('"esmera:menu-navigation-request"'),
    false,
  );
  assertEquals(menu.includes('"esmera:menu-navigation-request"'), false);
  assertEquals(coordinator.includes('.classList.add("is-closing")'), false);
});
