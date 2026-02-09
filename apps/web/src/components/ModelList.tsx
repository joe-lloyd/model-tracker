import { useEffect, useState } from "react";
import { type Model } from "@mini-vault/shared";
import {
  Loader2,
  Plus,
  Search,
  Tags,
  ShoppingCart,
  X,
  Edit,
} from "lucide-react";
import { Button } from "./ui";
import { Link, useSearchParams } from "react-router-dom";
import { InterestForm } from "./InterestForm";

export function ModelList({ onlyForSale = false }: { onlyForSale?: boolean }) {
  /* -------------------------------------------------------------------------
   * State
   * ----------------------------------------------------------------------- */
  // URL Params State
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const statusFilter =
    searchParams.get("status") || (onlyForSale ? "forSale" : "");
  const systemFilter = searchParams.get("system") || "";
  const factionFilter = searchParams.get("faction") || "";

  /* -------------------------------------------------------------------------
   * State
   * ----------------------------------------------------------------------- */
  const [data, setData] = useState<Model[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    totalModels: 0,
    totalPages: 1,
  });
  const [facets, setFacets] = useState<{
    systems: string[];
    factions: string[];
  }>({ systems: [], factions: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interest Modal State
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [selectedInterestModel, setSelectedInterestModel] =
    useState<Model | null>(null);

  // local search state for input field (debounced sync to URL)
  const [localSearch, setLocalSearch] = useState(search);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Admin unlock state
  const [isUnlocked, setIsUnlocked] = useState(
    !!localStorage.getItem("mini-vault-key"),
  );

  /* -------------------------------------------------------------------------
   * Effects
   * ----------------------------------------------------------------------- */
  // Debounce search input to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          if (localSearch) newParams.set("search", localSearch);
          else newParams.delete("search");
          newParams.set("page", "1"); // Reset to page 1
          return newParams;
        });
      }
      setDebouncedSearch(localSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchParams, search]);

  // Sync local search when URL changes (e.g. back button)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Restore scroll position if available
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("modelListScrollY");
    if (savedScroll) {
      // Timeout to ensure content is rendered?
      // If data is fetching, we might not be able to scroll yet.
      // We should perhaps do this after data fetch?
      // But if data comes from cache or is fast...
      // Actually correct place is after data is set.
    }
  }, []);

  // Check unlock status on mount/focus
  useEffect(() => {
    const check = () => setIsUnlocked(!!localStorage.getItem("mini-vault-key"));
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  // Fetch Data
  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          search: debouncedSearch,
          status: statusFilter,
          system: systemFilter,
          faction: factionFilter,
        });

        // Add sorting or specific filters if needed in future
        const res = await fetch(`/.netlify/functions/get-models?${params}`);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status ${res.status}: ${text}`);
        }

        const json = await res.json();
        // Handle both old array format (fallback) and new paginated format
        if (Array.isArray(json)) {
          setData(json); // Fallback if backend not updated
        } else {
          setData(json.data);
          setMeta(json.pagination);
          if (json.facets) {
            setFacets(json.facets);
          }
        }
      } catch (err: unknown) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [debouncedSearch, statusFilter, systemFilter, factionFilter, page, limit]); // Refetch on these changes

  // Update status filter if prop changes (e.g. navigation)
  useEffect(() => {
    if (onlyForSale && statusFilter !== "forSale") {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set("status", "forSale");
        return newParams;
      });
    }
  }, [onlyForSale, statusFilter, setSearchParams]);

  /* -------------------------------------------------------------------------
   * Handlers
   * ----------------------------------------------------------------------- */
  const handleNextPage = () => {
    if (page < meta.totalPages) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set("page", (page + 1).toString());
        return newParams;
      });
      window.scrollTo(0, 0);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set("page", (page - 1).toString());
        return newParams;
      });
      window.scrollTo(0, 0);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value) newParams.set(key, value);
      else newParams.delete(key);
      newParams.set("page", "1"); // Reset to page 1
      return newParams;
    });
  };

  /* -------------------------------------------------------------------------
   * Render
   * ----------------------------------------------------------------------- */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-destructive">
        <p>Error: {error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Interest Modal Overlay */}
      {showInterestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowInterestForm(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <InterestForm
                onClose={() => {
                  setShowInterestForm(false);
                  setSelectedInterestModel(null);
                }}
                selectedModels={
                  selectedInterestModel
                    ? [
                        {
                          name: selectedInterestModel.name,
                          price: selectedInterestModel.sellPrice,
                          count: selectedInterestModel.count,
                          image: selectedInterestModel.images?.[0],
                        },
                      ]
                    : []
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-auto sm:flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search models, tags..."
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pb-2 sm:pb-0">
          {/* System Filter */}
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[150px]"
            value={systemFilter}
            onChange={(e) => updateFilter("system", e.target.value)}
          >
            <option value="">All Systems</option>
            {facets.systems.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Faction Filter */}
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[150px]"
            value={factionFilter}
            onChange={(e) => updateFilter("faction", e.target.value)}
          >
            <option value="">All Factions</option>
            {facets.factions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="painted">🎨 Painted</option>
            <option value="assembled">🛠️ Assembled</option>
            <option value="primed">🌑 Primed</option>
            <option value="based">🌳 Based</option>
            <option value="forSale">💰 For Sale</option>
          </select>

          {!onlyForSale && (
            <Link to="/add">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </Link>
          )}

          {onlyForSale && (
            <Button
              size="sm"
              onClick={() => setShowInterestForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy / Contact
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading collection...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <p>No models found matching your criteria.</p>
          {(search || statusFilter) && (
            <Button
              variant="link"
              onClick={() => {
                setSearchParams(new URLSearchParams());
                setLocalSearch("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* List */}
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {data.map((model) => (
              <div
                key={model.id}
                className="break-inside-avoid-column bg-card rounded-lg border shadow-sm overflow-hidden"
              >
                <Link
                  to={`/model/${model.id}`}
                  state={{
                    model,
                    from: location.pathname + location.search,
                  }}
                  onClick={() => {
                    sessionStorage.setItem(
                      "modelListScrollY",
                      window.scrollY.toString(),
                    );
                  }}
                >
                  <div className="w-full relative bg-muted/20 cursor-pointer">
                    {model.images && model.images.length > 0 ? (
                      <img
                        src={
                          typeof model.images[0] === "string"
                            ? model.images[0]
                            : (model.images[0] as any).url
                        }
                        alt={model.name}
                        className="w-full h-auto block bg-muted"
                        loading="lazy"
                        style={
                          typeof model.images[0] !== "string" &&
                          (model.images[0] as any).width &&
                          (model.images[0] as any).height
                            ? {
                                aspectRatio: `${(model.images[0] as any).width} / ${(model.images[0] as any).height}`,
                              }
                            : undefined
                        }
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-muted/50 text-muted-foreground">
                        No Image
                      </div>
                    )}

                    {model.count > 1 && (
                      <span className="absolute top-2 right-2 bg-black/75 text-white text-xs font-bold px-2 py-1 rounded-full">
                        x{model.count}
                      </span>
                    )}
                    {model.forSale && (
                      <span className="absolute top-2 left-2 bg-green-600/90 text-white text-xs font-bold px-2 py-1 rounded-full flex gap-1 items-center">
                        <Tags className="w-3 h-3" />
                        {model.sellPrice
                          ? `€${(model.sellPrice * model.count).toFixed(2)}`
                          : "$$$"}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="p-4 space-y-2">
                  <Link
                    to={`/model/${model.id}`}
                    state={{
                      model,
                      from: location.pathname + location.search,
                    }}
                    onClick={() => {
                      sessionStorage.setItem(
                        "modelListScrollY",
                        window.scrollY.toString(),
                      );
                    }}
                    className="hover:underline"
                  >
                    <h3 className="font-semibold tracking-tight leading-tight">
                      {model.name}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded">
                      {model.system}
                    </span>
                    <span className="bg-muted px-1.5 py-0.5 rounded">
                      {model.faction}
                    </span>
                  </div>

                  {/* Status Indicators */}
                  <div className="flex justify-between items-center pt-2 gap-2">
                    <div className="flex gap-1">
                      {model.painted && (
                        <div
                          className="w-2 h-2 rounded-full bg-green-500"
                          title="Painted"
                        />
                      )}
                      {model.assembled && (
                        <div
                          className="w-2 h-2 rounded-full bg-blue-500"
                          title="Assembled"
                        />
                      )}
                      {model.primed && (
                        <div
                          className="w-2 h-2 rounded-full bg-gray-500"
                          title="Primed"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      {isUnlocked && (
                        <Link
                          to={`/edit/${model.id}`}
                          state={{
                            model,
                            from: location.pathname + location.search,
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Link>
                      )}
                      {model.forSale && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-green-700 hover:text-green-800 hover:bg-green-100"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedInterestModel(model);
                            setShowInterestForm(true);
                          }}
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" /> Buy
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Showing {data.length} of {meta.total} entries ({meta.totalModels}{" "}
              models)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <div className="flex items-center text-sm font-medium">
                Page {page} of {meta.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= meta.totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
