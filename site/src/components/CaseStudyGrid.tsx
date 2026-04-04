import { useState, useMemo, useRef, useEffect } from "react";

interface CaseStudy {
  slug: string;
  title: string;
  heroImage: string;
  filterFocus: string[];
  filterCycle: string[];
  filterX1: string[];
  filterBusinessModel: string[];
  filterMaterialFlow: string[];
}

interface FilterGroup {
  key: keyof Pick<
    CaseStudy,
    | "filterFocus"
    | "filterCycle"
    | "filterX1"
    | "filterBusinessModel"
    | "filterMaterialFlow"
  >;
  label: string;
  options: string[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "filterFocus",
    label: "Focus",
    options: ["MATERIALS", "COMPONENTS", "PRODUCT", "SYSTEM"],
  },
  {
    key: "filterCycle",
    label: "Cycle",
    options: ["TECHNICAL", "BIOLOGICAL"],
  },
  {
    key: "filterX1",
    label: "X1",
    options: ["MAINTAIN", "REUSE", "REFURBISH", "REMANUFACTURE", "RECYCLE"],
  },
  {
    key: "filterBusinessModel",
    label: "Business Model",
    options: ["PRODUCT ORIENTED", "USE ORIENTED", "RESULT ORIENTED"],
  },
  {
    key: "filterMaterialFlow",
    label: "Material Flow",
    options: ["LINEAR", "LINEAR EXTENSION", "CIRCULAR", "CIRCULAR EXTENSION"],
  },
];

export default function CaseStudyGrid({
  caseStudies,
}: {
  caseStudies: CaseStudy[];
}) {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<
    Record<string, Set<string>>
  >({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setFiltersOpen(false);
      }
    };
    if (filtersOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [filtersOpen]);

  const toggleFilter = (groupKey: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[groupKey] || []);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      if (set.size === 0) {
        delete next[groupKey];
      } else {
        next[groupKey] = set;
      }
      return next;
    });
  };

  const removeFilter = (groupKey: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[groupKey] || []);
      set.delete(value);
      if (set.size === 0) {
        delete next[groupKey];
      } else {
        next[groupKey] = set;
      }
      return next;
    });
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearch("");
  };

  const activeFilterCount = Object.values(activeFilters).reduce(
    (sum, set) => sum + set.size,
    0
  );
  const hasActiveFilters = activeFilterCount > 0 || search.length > 0;

  const filtered = useMemo(() => {
    return caseStudies.filter((cs) => {
      if (search && !cs.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      for (const [groupKey, values] of Object.entries(activeFilters)) {
        if (values.size === 0) continue;
        const csValues = cs[groupKey as keyof CaseStudy];
        if (!Array.isArray(csValues)) continue;
        if (!csValues.some((v: string) => values.has(v))) {
          return false;
        }
      }
      return true;
    });
  }, [caseStudies, search, activeFilters]);

  // Collect all active filter chips
  const activeChips: { groupKey: string; groupLabel: string; value: string }[] =
    [];
  for (const group of FILTER_GROUPS) {
    const set = activeFilters[group.key];
    if (set) {
      for (const value of set) {
        activeChips.push({
          groupKey: group.key,
          groupLabel: group.label,
          value,
        });
      }
    }
  }

  return (
    <div className="bg-[#f1ef2e] min-h-screen -mx-4 -mt-4 px-4 pt-4 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-8 lg:-mx-12 lg:-mt-12 lg:px-12 lg:pt-8">
      {/* Toolbar: search + filters button */}
      <div className="flex items-center gap-3 mb-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search case studies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/10 rounded-lg text-black placeholder-black/40 focus:outline-none focus:border-black/30 focus:ring-1 focus:ring-black/10 transition-colors"
          />
        </div>

        {/* Result count */}
        <span className="text-xs text-black/50 whitespace-nowrap">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>

        {/* Filters dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
              filtersOpen || activeFilterCount > 0
                ? "bg-black text-[#f1ef2e] border-black"
                : "bg-white text-black border-black/10 hover:border-black/30"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-[#f1ef2e] text-black">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {filtersOpen && (
            <div className="absolute right-0 top-full mt-2 w-[480px] max-w-[90vw] bg-white rounded-xl shadow-xl border border-black/10 p-4 z-50">
              <div className="grid grid-cols-2 gap-4">
                {FILTER_GROUPS.map((group) => (
                  <div
                    key={group.key}
                    className={
                      group.key === "filterMaterialFlow" ? "col-span-2" : ""
                    }
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 mb-1.5 block">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.options.map((option) => {
                        const isActive =
                          activeFilters[group.key]?.has(option);
                        return (
                          <button
                            key={option}
                            onClick={() => toggleFilter(group.key, option)}
                            className={`px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer ${
                              isActive
                                ? "bg-black text-white border-black font-medium"
                                : "bg-transparent text-black/60 border-black/15 hover:border-black/30 hover:text-black"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {activeFilterCount > 0 && (
                <div className="mt-3 pt-3 border-t border-black/10 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-xs text-black/50 hover:text-black transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {activeChips.map((chip) => (
            <button
              key={`${chip.groupKey}-${chip.value}`}
              onClick={() => removeFilter(chip.groupKey, chip.value)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-black text-white rounded-full cursor-pointer hover:bg-black/80 transition-colors"
            >
              {chip.value}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="text-[11px] text-black/40 hover:text-black transition-colors cursor-pointer ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-black/50 text-base">
            No case studies match your filters.
          </p>
          <button
            onClick={clearFilters}
            className="mt-3 text-black/70 hover:text-black text-sm underline transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((cs) => (
            <a
              key={cs.slug}
              href={`/case-studies/${cs.slug}`}
              className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                {cs.heroImage ? (
                  <img
                    src={cs.heroImage}
                    alt={cs.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/10" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-['Space_Grotesk'] font-semibold text-base text-black leading-tight group-hover:text-black/70 transition-colors">
                  {cs.title}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cs.filterX1.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-black/60 uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                  {cs.filterFocus.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-black/60 uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
