import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { type Model } from "@mini-vault/shared";
import { Loader2, ArrowLeft, ShoppingCart, Check } from "lucide-react";
import { Button } from "./ui";
import { InterestForm } from "./InterestForm";

export function ModelDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [model, setModel] = useState<Model | null>(
    (location.state as { model?: Model })?.model || null,
  );
  const [loading, setLoading] = useState(!model);
  const [error, setError] = useState<string | null>(null);

  // Interest Modal
  const [showInterestForm, setShowInterestForm] = useState(false);

  // Image Selection
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Reset index when ID changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [id]);

  useEffect(() => {
    if (!model && id) {
      async function fetchModel() {
        try {
          const res = await fetch(`/.netlify/functions/get-models?id=${id}`);
          if (res.ok) {
            const json = await res.json();
            // If returns array find one, if returns one use it.
            const found = Array.isArray(json)
              ? json.find((m: Model) => m.id === id)
              : json.data?.find((m: Model) => m.id === id);
            if (found) setModel(found);
            else throw new Error("Model not found");
          } else {
            throw new Error("Failed to load model");
          }
        } catch {
          setError("Could not load model details.");
        } finally {
          setLoading(false);
        }
      }
      fetchModel();
    }
  }, [id, model]);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (error || !model)
    return (
      <div className="p-8 text-center text-red-500">
        {error || "Model not found"}
      </div>
    );

  const from = (location.state as { from?: string })?.from;

  // Render images helper
  const renderImageSrc = (
    img: string | { url: string; width?: number; height?: number },
  ) => (typeof img === "string" ? img : img.url);

  const currentImage = model.images && model.images[selectedImageIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Navigation / Back */}
      <div className="flex items-center gap-2">
        <Link
          to={from || "/"}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back {from ? "" : "to Collection"}
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Images Column */}
        <div className="space-y-4 sticky top-4">
          <div className="aspect-square bg-muted rounded-xl overflow-hidden border shadow-sm relative group bg-white dark:bg-zinc-900">
            {currentImage ? (
              <img
                src={renderImageSrc(currentImage)}
                alt={model.name}
                className="w-full h-full object-contain bg-muted" // Contain to show full image without crop in detail view? Or Cover?
                // Let's stick to cover for consistency, or maybe contain with a nice background?
                // Cover usually looks better for grid, but detail view people want to see the whole model.
                // Let's try contain for detail view if aspect ratio allows, but cover is safe default.
                // Reverting to object-cover to match existing style, but maybe object-contain is better for detail?
                // Let's use object-cover for now to fill the square.
                style={
                  typeof currentImage !== "string" &&
                  currentImage.width &&
                  currentImage.height
                    ? {
                        aspectRatio: `${currentImage.width} / ${currentImage.height}`,
                      }
                    : undefined
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}

            {model.count > 1 && (
              <span className="absolute top-4 right-4 bg-black/80 text-white font-bold px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                x{model.count}
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {model.images && model.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {model.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                    i === selectedImageIndex
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={renderImageSrc(img)}
                    alt={`View ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Column */}
        <div className="space-y-8">
          {/* Header Info */}
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  {model.name}
                </h1>
                {model.forSale && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                      {model.sellPrice
                        ? `€${(model.sellPrice * model.count).toFixed(2)}`
                        : "Contact"}
                    </div>
                    {model.retailPrice && (
                      <div className="text-sm text-muted-foreground line-through decoration-destructive/50">
                        Retail: €{(model.retailPrice * model.count).toFixed(2)}
                      </div>
                    )}
                    {model.count > 1 && model.sellPrice && (
                      <div className="text-xs text-muted-foreground mt-1">
                        €{model.sellPrice} ea.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3 text-muted-foreground">
                {model.manufacturer && (
                  <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
                    {model.manufacturer}
                  </span>
                )}
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  {model.system}
                </span>
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  {model.faction}
                </span>
              </div>
            </div>

            {/* Tags */}
            {model.tags && model.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {model.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status Grid */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusItem label="Assembled" active={model.assembled} />
              <StatusItem label="Primed" active={model.primed} />
              <StatusItem label="Painted" active={model.painted} />
              <StatusItem label="Based" active={model.based} />
            </div>
          </div>

          {/* Notes */}
          {model.notes && (
            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-lg">Notes</h3>
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {model.notes}
              </div>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="pt-6 border-t flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>
                Added on {new Date(model.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Button */}
          {model.forSale && (
            <div className="pt-2 sticky bottom-4 z-10">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg shadow-lg"
                onClick={() => setShowInterestForm(true)}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                I'm Interested
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Modal Logic remains same */}

      {/* Interest Modal Overlay */}
      {showInterestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg relative animate-in zoom-in-95 duration-200 p-6">
            <button
              onClick={() => setShowInterestForm(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <span className="sr-only">Close</span>✕
            </button>
            <InterestForm
              onClose={() => setShowInterestForm(false)}
              selectedModels={[
                {
                  name: model.name,
                  price: model.sellPrice,
                  count: model.count,
                  image: model.images?.[0],
                },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded border ${active ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-muted/30 opacity-60"}`}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${active ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-700"}`}
      >
        {active && <Check className="w-3 h-3" />}
      </div>
      <span className={active ? "font-medium" : ""}>{label}</span>
    </div>
  );
}
