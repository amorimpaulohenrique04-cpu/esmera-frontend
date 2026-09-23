import { assertEquals } from "@std/assert";
import {
  expandMaterialFilters,
  normalizeMaterials,
  resolveMaterialFilterKeys,
} from "../../loaders/Esmera/MaterialFacets.ts";

Deno.test("projects descriptive CMS materials into compact public facets", () => {
  const facets = normalizeMaterials([
    {
      value: "Rocha de esmeralda natural",
      label: "Rocha de esmeralda natural",
      count: 8,
    },
    { value: "Bege Bahia natural", label: "Bege Bahia natural", count: 5 },
    {
      value: "Bege Bahia e calcário laranja",
      label: "Bege Bahia e calcário laranja",
      count: 3,
    },
    {
      value: "Rocha de esmeralda natural, resina e base metálica",
      label: "Rocha de esmeralda natural, resina e base metálica",
      count: 2,
    },
  ], 12);

  assertEquals(
    facets.map(({ value, label, count }) => ({ value, label, count })),
    [
      { value: "esmeralda", label: "Esmeralda", count: 10 },
      { value: "bege-bahia", label: "Bege Bahia", count: 8 },
      { value: "calcario", label: "Calcário", count: 3 },
      { value: "resina", label: "Resina", count: 2 },
      { value: "metal", label: "Metal", count: 2 },
    ],
  );

  assertEquals(expandMaterialFilters(["esmeralda", "metal"], facets), [
    "esmeralda",
    "metal",
  ]);
  assertEquals(
    resolveMaterialFilterKeys(["Rocha de esmeralda natural"], facets),
    ["esmeralda"],
  );
});
