import {
  buildNavigationTree,
  type StorefrontCategory,
} from "../../lib/payload/navigation.ts";
import type { PayloadNavigation } from "../../lib/payload/types.ts";

const categories: StorefrontCategory[] = [
  {
    id: "pieces",
    title: "PEÇAS",
    label: "PEÇAS",
    slug: "pecas",
    description: "Objetos organizados por uso.",
    order: 1,
    parentId: null,
    showInMenu: true,
    menuVisibility: "both",
    nodeType: "group",
    href: "/colecao/pecas",
    external: false,
    highlights: [],
  },
  {
    id: "lavabo",
    title: "LAVABO",
    label: "LAVABO",
    slug: "lavabo",
    description: "",
    order: 1,
    parentId: "pieces",
    showInMenu: true,
    menuVisibility: "both",
    nodeType: "collection",
    href: "/colecao/lavabo",
    external: false,
    highlights: [],
  },
  {
    id: "hidden",
    title: "Interno",
    label: "Interno",
    slug: "interno",
    description: "",
    order: 2,
    parentId: null,
    showInMenu: false,
    menuVisibility: "both",
    nodeType: "collection",
    href: "/colecao/interno",
    external: false,
    highlights: [],
  },
];

Deno.test("menu v2 derives the same hierarchy for desktop and mobile", () => {
  const tree = buildNavigationTree(categories, null);
  if (tree.length !== 1 || tree[0].label !== "PEÇAS") {
    throw new Error("root hierarchy was not derived from Categories");
  }
  if (tree[0].children[0]?.label !== "LAVABO") {
    throw new Error("child hierarchy was not preserved");
  }
});

Deno.test("menu v2 appends visible CMS roots missing from explicit navigation", () => {
  const kits: StorefrontCategory = {
    id: "kits",
    title: "KITS",
    label: "KITS",
    slug: "kits",
    description: "",
    order: 2,
    parentId: null,
    showInMenu: true,
    menuVisibility: "both",
    nodeType: "collection",
    href: "/colecao/kits",
    external: false,
    highlights: [],
  };
  const navigation = {
    categoryLinks: [{ category: "pieces", active: true }],
  } as unknown as PayloadNavigation;

  const tree = buildNavigationTree([...categories, kits], navigation);
  const labels = tree.map((node) => node.label).join(",");
  if (labels !== "PEÇAS,KITS") {
    throw new Error(
      `expected explicit roots followed by CMS roots, got ${labels}`,
    );
  }
});
