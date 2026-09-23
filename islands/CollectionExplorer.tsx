import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import ObjectCard from "../components/esmera/ObjectCard.tsx";
import type { CatalogFilter, CollectionSort } from "../lib/payload/catalog.ts";
import type { StorefrontProductV2 } from "../lib/esmera/storefront.ts";
import type { MaterialFacet } from "../loaders/Esmera/MaterialFacets.ts";

export interface CollectionExplorerProps {
  initialItems: StorefrontProductV2[];
  initialTotalDocs: number;
  initialPage: number;
  initialTotalPages: number;
  initialHasNextPage: boolean;
  endpoint: string;
  visibleFilters: CatalogFilter[];
  categories: Array<{ title: string; slug: string }>;
  materials: MaterialFacet[];
  initial: {
    q: string;
    category: string;
    materials: string[];
    availability: string;
    sort: CollectionSort;
  };
  emptyStateTitle: string;
  emptyStateCopy: string;
}

interface CollectionResponse {
  items: StorefrontProductV2[];
  pagination: {
    page: number;
    totalPages: number;
    totalDocs: number;
    hasNextPage: boolean;
  };
}

const availabilityOptions = [
  ["available", "Disponível"],
  ["unique", "Peça única"],
  ["limited", "Edição limitada"],
  ["made_to_order", "Sob encomenda"],
] as const;

const sortOptions: Array<[CollectionSort, string]> = [
  ["editorial", "Seleção editorial"],
  ["newest", "Novidades"],
  ["price-asc", "Menor preço"],
  ["price-desc", "Maior preço"],
  ["name", "Nome"],
];

interface FacetSelectProps {
  id: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  ariaLabel: string;
  onChange: (value: string) => void;
}

function FacetSelect({
  id,
  value,
  options,
  ariaLabel,
  onChange,
}: FacetSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex(([optionValue]) => optionValue === value),
  );
  const selectedLabel = options[selectedIndex]?.[1] ?? options[0]?.[1] ?? "";

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    const timer = globalThis.setTimeout(
      () => optionRefs.current[selectedIndex]?.focus(),
      0,
    );
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      globalThis.clearTimeout(timer);
    };
  }, [open, selectedIndex]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const focusOption = (index: number) => {
    const nextIndex = (index + options.length) % options.length;
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div class="esv-facet-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        class="esv-facet-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        <span>{selectedLabel}</span>
        <svg aria-hidden="true" viewBox="0 0 12 8" width="12" height="8">
          <path
            d="m1 1.25 5 5 5-5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="1"
          />
        </svg>
      </button>
      {open && (
        <div
          id={`${id}-listbox`}
          class="esv-facet-select-list"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map(([optionValue, label], index) => (
            <button
              key={optionValue || "all"}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={optionValue === value}
              class={optionValue === value ? "is-selected" : ""}
              onClick={() => selectOption(optionValue)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusOption(index + 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusOption(index - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusOption(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusOption(options.length - 1);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterState {
  q: string;
  category: string;
  materials: string[];
  availability: string;
  sort: CollectionSort;
  page: number;
}

function paramsFromState(state: FilterState, materialValues = state.materials) {
  const params = new URLSearchParams();
  if (state.q.trim().length >= 2) params.set("q", state.q.trim());
  if (state.category) params.set("category", state.category);
  for (const material of materialValues) params.append("material", material);
  if (state.availability) params.set("availability", state.availability);
  if (state.sort !== "editorial") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

function rawMaterialValues(
  selected: string[],
  facets: MaterialFacet[],
): string[] {
  return [
    ...new Set(selected.flatMap((value) => {
      const facet = facets.find((item) => item.value === value);
      return facet?.queryValues.length ? facet.queryValues : [value];
    })),
  ];
}

function countLabel(total: number): string {
  return `${total} ${total === 1 ? "peça" : "peças"}`;
}

function loadedCountLabel(loaded: number, total: number): string {
  return loaded < total
    ? `${loaded} de ${countLabel(total)}`
    : countLabel(total);
}

export default function CollectionExplorer(props: CollectionExplorerProps) {
  const [items, setItems] = useState(props.initialItems);
  const [totalDocs, setTotalDocs] = useState(props.initialTotalDocs);
  const [page, setPage] = useState(props.initialPage);
  const [totalPages, setTotalPages] = useState(props.initialTotalPages);
  const [hasNextPage, setHasNextPage] = useState(props.initialHasNextPage);
  const [qInput, setQInput] = useState(props.initial.q);
  const [q, setQ] = useState(props.initial.q);
  const [category, setCategory] = useState(props.initial.category);
  const [materials, setMaterials] = useState<string[]>(props.initial.materials);
  const [availability, setAvailability] = useState(props.initial.availability);
  const [sort, setSort] = useState<CollectionSort>(props.initial.sort);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firstFilterRun = useRef(true);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setQ(qInput.trim()), 250);
    return () => globalThis.clearTimeout(timer);
  }, [qInput]);

  useEffect(() => {
    if (
      !filtersOpen || !globalThis.matchMedia?.("(max-width: 767px)").matches
    ) {
      return;
    }
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [filtersOpen]);

  const load = async (nextPage: number, append: boolean) => {
    if (append && loading) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setReplacing(!append);
    setError("");

    const state: FilterState = {
      q,
      category,
      materials,
      availability,
      sort,
      page: nextPage,
    };
    const requestParams = paramsFromState(
      state,
      rawMaterialValues(materials, props.materials),
    );
    const endpoint = new URL(props.endpoint, globalThis.location.origin);
    for (
      const key of [
        "q",
        "category",
        "material",
        "availability",
        "sort",
        "page",
      ]
    ) {
      endpoint.searchParams.delete(key);
    }
    requestParams.forEach((value, key) =>
      endpoint.searchParams.append(key, value)
    );

    try {
      const response = await fetch(endpoint.toString(), {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("collection_unavailable");
      const data = await response.json() as CollectionResponse;
      setItems((current) => {
        const incoming = append ? [...current, ...data.items] : data.items;
        const unique = new Map(incoming.map((item) => [item.id, item]));
        return [...unique.values()];
      });
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
      setTotalDocs(data.pagination.totalDocs);
      setHasNextPage(data.pagination.hasNextPage);

      const publicParams = paramsFromState({
        ...state,
        page: data.pagination.page,
      });
      const serialized = publicParams.toString();
      const nextURL = `${globalThis.location.pathname}${
        serialized ? `?${serialized}` : ""
      }`;
      globalThis.history.replaceState(
        {
          ...globalThis.history.state,
          esmeraCollectionPage: data.pagination.page,
        },
        "",
        nextURL,
      );
    } catch {
      if (!controller.signal.aborted) {
        setError("Não foi possível atualizar a coleção agora.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setReplacing(false);
      }
    }
  };

  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    void load(1, false);
    return () => controllerRef.current?.abort();
  }, [q, category, materials, availability, sort]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading) void load(page + 1, true);
    }, { rootMargin: "600px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [page, hasNextPage, loading, q, category, materials, availability, sort]);

  const refinementCount = (category ? 1 : 0) + materials.length +
    (availability ? 1 : 0);

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (q.length >= 2) {
      chips.push({
        key: "q",
        label: `Busca: ${q}`,
        clear: () => {
          setQInput("");
          setQ("");
        },
      });
    }
    if (category) {
      const label = props.categories.find((item) => item.slug === category)
        ?.title || category;
      chips.push({ key: "category", label, clear: () => setCategory("") });
    }
    for (const material of materials) {
      const label = props.materials.find((item) => item.value === material)
        ?.label || material;
      chips.push({
        key: `material:${material}`,
        label,
        clear: () =>
          setMaterials((current) =>
            current.filter((value) => value !== material)
          ),
      });
    }
    if (availability) {
      const label = availabilityOptions.find(([value]) =>
        value === availability
      )
        ?.[1] || availability;
      chips.push({
        key: "availability",
        label,
        clear: () => setAvailability(""),
      });
    }
    return chips;
  }, [q, category, materials, availability, props.categories, props.materials]);

  const clearRefinements = () => {
    setCategory("");
    setMaterials([]);
    setAvailability("");
  };

  const clearAllFilters = () => {
    setQInput("");
    setQ("");
    clearRefinements();
  };

  const toggleMaterial = (value: string) => {
    setMaterials((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const renderActiveChips = () =>
    activeFilters.map((chip) => (
      <button type="button" key={chip.key} onClick={chip.clear}>
        {chip.label}
        <span aria-hidden="true">×</span>
      </button>
    ));

  return (
    <div class="esv-collection-v2" aria-busy={loading ? "true" : "false"}>
      <div class="esv-collection-v2-count" aria-live="polite">
        {loadedCountLabel(items.length, totalDocs)}
      </div>

      <div class="esv-collection-v2-controls">
        <label class="esv-collection-v2-search">
          <span class="esv-sr-only">Buscar nesta coleção</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
            <circle
              cx="10.5"
              cy="10.5"
              r="6.2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
            />
            <path
              d="m15.25 15.25 4.25 4.25"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.4"
            />
          </svg>
          <input
            type="search"
            value={qInput}
            placeholder="Buscar peças"
            autocomplete="off"
            onInput={(event) => setQInput(event.currentTarget.value)}
          />
        </label>

        <div class="esv-collection-v2-toolbar">
          <button
            class={`esv-collection-v2-filter-trigger${
              filtersOpen ? " is-active" : ""
            }`}
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="esv-collection-filters"
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <svg
              class="esv-collection-v2-filter-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.25"
              />
              <circle
                cx="14.5"
                cy="6"
                r="1.75"
                fill="var(--bg)"
                stroke="currentColor"
                stroke-width="1.25"
              />
              <circle
                cx="9"
                cy="12"
                r="1.75"
                fill="var(--bg)"
                stroke="currentColor"
                stroke-width="1.25"
              />
              <circle
                cx="15.5"
                cy="18"
                r="1.75"
                fill="var(--bg)"
                stroke="currentColor"
                stroke-width="1.25"
              />
            </svg>
            <span class="esv-collection-v2-filter-label">Filtros</span>
            {refinementCount > 0 && (
              <span class="esv-collection-v2-filter-count">
                {refinementCount}
              </span>
            )}
          </button>

          <div class="esv-collection-v2-sort">
            <span class="esv-collection-v2-sort-label">Ordenar por</span>
            <FacetSelect
              id="esv-sort"
              ariaLabel="Ordenar coleção"
              value={sort}
              options={sortOptions}
              onChange={(value) => setSort(value as CollectionSort)}
            />
          </div>
        </div>
      </div>

      {filtersOpen && (
        <button
          type="button"
          class="esv-collection-v2-filter-backdrop"
          aria-label="Fechar filtros"
          onClick={() => setFiltersOpen(false)}
        />
      )}

      <div
        id="esv-collection-filters"
        class={`esv-collection-v2-filters${filtersOpen ? " is-open" : ""}`}
      >
        <div class="esv-collection-v2-filter-head">
          <strong>Filtros</strong>
          <button
            class="esv-collection-v2-filter-close"
            type="button"
            onClick={() => setFiltersOpen(false)}
          >
            Fechar
          </button>
        </div>

        <div class="esv-collection-v2-filter-fields">
          {props.visibleFilters.includes("category") && (
            <div class="esv-collection-v2-filter-field esv-collection-v2-category-field">
              <span>Categoria</span>
              <FacetSelect
                id="esv-category"
                ariaLabel="Filtrar por categoria"
                value={category}
                options={[
                  ["", "Todas"],
                  ...props.categories.map((item) =>
                    [item.slug, item.title] as const
                  ),
                ]}
                onChange={setCategory}
              />
            </div>
          )}

          {props.visibleFilters.includes("material") &&
            props.materials.length > 0 && (
            <div class="esv-collection-v2-filter-field esv-collection-v2-material-field">
              <span>Matéria</span>
              <div
                class="esv-collection-v2-materials"
                role="group"
                aria-label="Filtrar por matéria"
              >
                {props.materials.map((item) => {
                  const selected = materials.includes(item.value);
                  return (
                    <button
                      type="button"
                      key={item.value}
                      class={selected ? "is-selected" : ""}
                      aria-pressed={selected}
                      aria-label={`${item.label}, ${countLabel(item.count)}`}
                      onClick={() => toggleMaterial(item.value)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {props.visibleFilters.includes("availability") && (
            <div class="esv-collection-v2-filter-field esv-collection-v2-availability-field">
              <span>Disponibilidade</span>
              <FacetSelect
                id="esv-availability"
                ariaLabel="Filtrar por disponibilidade"
                value={availability}
                options={[["", "Todas"], ...availabilityOptions]}
                onChange={setAvailability}
              />
              <button
                class="esv-collection-v2-clear-inline"
                type="button"
                disabled={activeFilters.length === 0}
                onClick={clearAllFilters}
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>

        <div class="esv-collection-v2-active-strip">
          <div class="esv-collection-v2-active-strip-main">
            <span class="esv-collection-v2-active-label">Filtros ativos</span>
            <div
              class="esv-collection-v2-active-chips"
              aria-label="Filtros aplicados"
            >
              {activeFilters.length > 0
                ? renderActiveChips()
                : (
                  <span class="esv-collection-v2-active-empty">
                    Nenhum filtro aplicado
                  </span>
                )}
            </div>
          </div>
          <button
            type="button"
            class="esv-collection-v2-hide-filters"
            onClick={() => setFiltersOpen(false)}
          >
            Ocultar filtros
            <svg aria-hidden="true" viewBox="0 0 12 8" width="11" height="7">
              <path
                d="m1 6.75 5-5 5 5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1"
              />
            </svg>
          </button>
        </div>

        <div class="esv-collection-v2-filter-actions">
          <button
            type="button"
            disabled={refinementCount === 0}
            onClick={clearRefinements}
          >
            Limpar
          </button>
          <button
            class="esv-collection-v2-results-action"
            type="button"
            onClick={() => setFiltersOpen(false)}
          >
            Ver {countLabel(totalDocs)}
          </button>
        </div>
      </div>

      {!filtersOpen && activeFilters.length > 0 && (
        <div class="esv-collection-v2-chips" aria-label="Filtros aplicados">
          {renderActiveChips()}
          <button
            type="button"
            class="esv-collection-v2-clear"
            onClick={clearAllFilters}
          >
            Limpar tudo
          </button>
        </div>
      )}

      {error && <p class="esv-collection-v2-error" role="alert">{error}</p>}

      {items.length > 0
        ? (
          <div
            class={`esv-collection-v2-grid${replacing ? " is-updating" : ""}`}
            role="list"
          >
            {items.map((item, index) => (
              <ObjectCard key={item.id} item={item} motionOrder={index % 4} />
            ))}
          </div>
        )
        : !loading && (
          <div class="esv-collection-v2-empty" role="status">
            <p>{props.emptyStateTitle}</p>
            {props.emptyStateCopy && <p>{props.emptyStateCopy}</p>}
          </div>
        )}

      {loading && items.length === 0 && (
        <div
          class="esv-collection-v2-grid esv-collection-v2-skeleton-grid"
          aria-hidden="true"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div class="esv-collection-v2-skeleton" key={index}>
              <span />
              <i />
              <i />
            </div>
          ))}
        </div>
      )}

      <div
        ref={sentinelRef}
        class="esv-collection-v2-sentinel"
        aria-hidden="true"
      />
      {hasNextPage && (
        <div class="esv-collection-v2-more">
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(page + 1, true)}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
          <span>Página {page} de {totalPages}</span>
        </div>
      )}
    </div>
  );
}
