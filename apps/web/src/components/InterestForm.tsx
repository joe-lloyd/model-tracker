import { useState } from "react";
import { Button, Input, Label, Textarea } from "./ui";
import { Loader2, Send } from "lucide-react";

export interface InterestModel {
  name: string;
  price?: number;
  image?: string | { url: string };
  count?: number;
}

export function InterestForm({
  selectedModels = [],
  onClose,
}: {
  selectedModels?: InterestModel[];
  onClose?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create form data native way for Netlify Forms
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData as any).toString(),
      });
      setSubmitted(true);
      if (onClose) {
        setTimeout(onClose, 2000);
      }
    } catch (error) {
      console.error("Form error:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
          Request Sent!
        </h3>
        <p className="text-green-700 dark:text-green-400">
          Thanks for your interest. I'll get back to you shortly via email.
        </p>
      </div>
    );
  }

  const orderDetails = selectedModels
    .map(
      (m) =>
        `- ${m.count || 1}x ${m.name} (${m.price ? `€${(m.price * (m.count || 1)).toFixed(2)}` : "N/A"})`,
    )
    .join("\n");

  const defaultMessage =
    selectedModels.length > 0
      ? `Hi, I'm interested in buying:\n${orderDetails}\n\nPlease let me know if these are still available.`
      : "Hi, I'm interested in buying some models from your sell pile.";

  return (
    <form
      name="interest"
      method="POST"
      data-netlify="true"
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded-lg bg-card shadow-sm"
    >
      <input type="hidden" name="form-name" value="interest" />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact to Buy</h3>

        {/* Selected Items Summary */}
        {selectedModels.length > 0 && (
          <div className="space-y-2 bg-muted/30 p-3 rounded-md border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Order Summary
            </p>
            {selectedModels.map((model, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                {/* Mini Image */}
                <div className="h-12 w-12 flex-shrink-0 bg-muted rounded overflow-hidden border">
                  {model.image ? (
                    <img
                      src={
                        typeof model.image === "string"
                          ? model.image
                          : model.image.url
                      }
                      alt={model.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[8px] text-muted-foreground">
                      No img
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{model.name}</p>
                  <div className="flex text-xs text-muted-foreground gap-2">
                    <span>Qty: {model.count || 1}</span>
                    {model.price && (
                      <span>
                        • Price: €
                        {(model.price * (model.count || 1)).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Items are located in Amsterdam for pickup, or shipping can be
          arranged.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientName">Name</Label>
        <Input id="clientName" name="name" placeholder="Your Name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientEmail">Email</Label>
        <Input
          id="clientEmail"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientMessage">Message</Label>
        <Textarea
          id="clientMessage"
          name="message"
          placeholder="I'm interested in..."
          defaultValue={defaultMessage}
          required
          rows={4}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Sending..." : "Send Request"}
      </Button>
    </form>
  );
}
