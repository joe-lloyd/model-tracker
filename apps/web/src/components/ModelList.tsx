import { useEffect, useState, useMemo } from "react";
import { type Model } from "@mini-vault/shared";
import { Loader2, Plus, Search, Tags } from "lucide-react";
import { Button } from "./ui";
import { Link } from "react-router-dom";

export function ModelList({ onlyForSale = false }: { onlyForSale?: boolean }) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/.netlify/functions/get-models");

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status ${res.status}: ${text}`);
        }

        const data = await res.json();
        // Sort by newest first
        const sorted = Array.isArray(data)
          ? data.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
          : [];
        setModels(sorted);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, []);

  const filteredModels = useMemo(() => {
    if (onlyForSale) {
      return models.filter((m) => m.forSale);
    }
    return models;
  }, [models, onlyForSale]);

  const totalModelCount = useMemo(() => {
    return filteredModels.reduce((acc, curr) => acc + (curr.count || 1), 0);
  }, [filteredModels]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading collection...</p>
      </div>
    );
  }

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

  if (filteredModels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-muted/30 p-6 rounded-full mb-4">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {onlyForSale ? "No models for sale" : "No models yet"}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-xs">
          {onlyForSale
            ? "Mark some items as 'For Sale' to see them here."
            : "Your vault is empty. Add your first miniature to start tracking!"}
        </p>
        {!onlyForSale && (
          <Link to="/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Logic
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Masonry Layout using CSS Columns */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {filteredModels.map((model) => (
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

      <div className="pt-8 text-center text-xs text-muted-foreground">
        {totalModelCount} model{totalModelCount !== 1 && "s"} in vault
      </div>
    </div>
  );
}
