import { useEffect, useState } from "react";
import { type Model } from "@mini-vault/shared";
import { Loader2, Plus, Search, Tags } from "lucide-react";
import { Button } from "./ui";
import { Link } from "react-router-dom";

export function ModelList({ onlyForSale = false }: { onlyForSale?: boolean }) {
  /* -------------------------------------------------------------------------
   * State
   * ----------------------------------------------------------------------- */
  const [data, setData] = useState<Model[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    onlyForSale ? "forSale" : "",
  );
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  /* -------------------------------------------------------------------------
   * Effects
   * ----------------------------------------------------------------------- */
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Data
  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          search: debouncedSearch,
          status: statusFilter,
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
          setPagination(json.pagination);
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [debouncedSearch, statusFilter, pagination.page, pagination.limit]); // Refetch on these changes

  // Update status filter if prop changes (e.g. navigation)
  useEffect(() => {
    if (onlyForSale) setStatusFilter("forSale");
  }, [onlyForSale]);

  /* -------------------------------------------------------------------------
   * Handlers
   * ----------------------------------------------------------------------- */
  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination((p) => ({ ...p, page: p.page + 1 }));
      window.scrollTo(0, 0);
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination((p) => ({ ...p, page: p.page - 1 }));
      window.scrollTo(0, 0);
    }
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
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-auto sm:flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search models, tags..."
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="">All Statuses</option>
            <option value="painted">🎨 Painted</option>
            <option value="assembled">🛠️ Assembled</option>
            <option value="primed">🌑 Primed</option>
            <option value="based">uD83CuDF3F Based</option>
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
                setSearch("");
                setStatusFilter("");
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
                className="break-inside-avoid mb-4 group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image Link */}
                <Link to={`/edit/${model.id}`} state={{ model }}>
                  {/* Image - Native Aspect Ratio */}
                  <div className="w-full relative bg-muted/20 cursor-pointer">
                    {model.images && model.images.length > 0 ? (
                      <img
                        src={model.images[0]}
                        alt={model.name}
                        className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center text-muted-foreground bg-muted/50">
                        No Image
                      </div>
                    )}

                    {/* Count Badge */}
                    {model.count > 1 && (
                      <span className="absolute top-2 right-2 bg-black/75 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                        x{model.count}
                      </span>
                    )}

                    {/* For Sale Badge */}
                    {model.forSale && (
                      <span className="absolute top-2 left-2 bg-green-600/90 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
                        <Tags className="w-3 h-3" />
                        $$$
                      </span>
                    )}
                  </div>
                </Link>

                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <Link
                      to={`/edit/${model.id}`}
                      state={{ model }}
                      className="hover:underline"
                    >
                      <h3 className="font-semibold tracking-tight leading-tight">
                        {model.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded">
                      {model.system}
                    </span>
                    <span className="bg-muted px-1.5 py-0.5 rounded">
                      {model.faction}
                    </span>
                  </div>

                  {/* Status Indicators */}
                  <div className="flex gap-1 pt-2">
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
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Showing {data.length} of {pagination.total} models
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pagination.page <= 1 || loading}
              >
                Previous
              </Button>
              <div className="flex items-center text-sm font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages || loading}
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
