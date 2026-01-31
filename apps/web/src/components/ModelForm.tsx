import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ModelInputSchema,
  type ModelInput,
  SYSTEMS,
  FACTIONS,
  MANUFACTURERS,
  TAGS,
} from "@mini-vault/shared";
import { Loader2 } from "lucide-react";

import { ImageUpload } from "./ImageUpload";
import { Input, Button, Label, Textarea } from "./ui";
import { uploadToCloudinary } from "@/lib/cloudinary";

// Custom mode state
// Add onSuccess to props
export function ModelForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFiles, setFormFiles] = useState<File[]>([]);

  // Custom mode state
  const [isCustomSystem, setIsCustomSystem] = useState(false);
  const [isCustomFaction, setIsCustomFaction] = useState(false);
  const [isCustomManufacturer, setIsCustomManufacturer] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ModelInput>({
    resolver: zodResolver(ModelInputSchema),
    defaultValues: {
      count: 1,
      painted: false,
      assembled: false,
      primed: false,
      based: false,
      tags: [],
      images: [],
    },
  });

  // Persistence Logic
  useEffect(() => {
    // 1. Load saved data on mount
    const saved = localStorage.getItem("model-tracker-form");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Special handling: don't load images, but load everything else
        Object.keys(parsed).forEach((key) => {
          if (key !== "images") {
            setValue(key as any, parsed[key]);
          }
        });

        // Restore custom flags if saved values exist but match no list
        if (parsed.system && !SYSTEMS.includes(parsed.system)) {
          setIsCustomSystem(true);
        }
        if (parsed.faction && !FACTIONS.includes(parsed.faction)) {
          setIsCustomFaction(true);
        }
        if (
          parsed.manufacturer &&
          !MANUFACTURERS.includes(parsed.manufacturer)
        ) {
          setIsCustomManufacturer(true);
        }
      } catch (e) {
        console.error("Failed to load saved form", e);
      }
    }
  }, [setValue]);

  useEffect(() => {
    // 2. Save data on change
    const subscription = watch((value) => {
      localStorage.setItem("model-tracker-form", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const systemValue = watch("system");
  const factionValue = watch("faction");
  const manufacturerValue = watch("manufacturer");

  const [vaultKey, setVaultKey] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  // Load key from storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("mini-vault-key");
    if (savedKey) {
      setVaultKey(savedKey);
      setIsLocked(false);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultKey.trim()) {
      localStorage.setItem("mini-vault-key", vaultKey.trim());
      setIsLocked(false);
    }
  };

  const onSubmit = async (data: ModelInput) => {
    setIsSubmitting(true);
    try {
      // 1. Upload Images
      const uploadPromises = formFiles.map((file) => uploadToCloudinary(file));
      const uploadResults = await Promise.all(uploadPromises);
      const imageUrls = uploadResults.map((r) => r.secure_url);

      const finalData = {
        ...data,
        images: imageUrls,
      };

      // 2. Submit to Netlify Function with Key
      const response = await fetch("/.netlify/functions/submit-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vault-key": vaultKey,
        },
        body: JSON.stringify(finalData),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (!response.ok) {
        let errorMessage = "Failed to save model";
        if (response.status === 401) {
          errorMessage = "Unauthorized! Check your Vault Key.";
          setIsLocked(true); // Re-lock if key is rejected
        } else if (result && result.error) {
          errorMessage =
            typeof result.error === "string"
              ? result.error
              : JSON.stringify(result.error);
        } else {
          errorMessage = text || response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (!result) {
        throw new Error("Server succeeded but returned no JSON data");
      }
      console.log("Success:", result);
      alert("Model Saved Successfully!");

      reset();
      setFormFiles([]);
      setIsCustomSystem(false);
      setIsCustomFaction(false);
      setIsCustomManufacturer(false);
      localStorage.removeItem("model-tracker-form"); // Clear saved state on success

      if (onSuccess) onSuccess(); // Navigate back to list
    } catch (error: any) {
      console.error(error);
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 max-w-md mx-auto mt-10 border rounded-lg shadow-sm">
        <h2 className="text-xl font-bold">🔐 Vault Access</h2>
        <p className="text-sm text-muted-foreground text-center">
          Enter your secret key to enable adding models. This will be saved on
          this device.
        </p>
        <form onSubmit={handleUnlock} className="flex flex-col gap-4 w-full">
          <Input
            type="password"
            placeholder="Enter Vault Key..."
            value={vaultKey}
            onChange={(e) => setVaultKey(e.target.value)}
          />
          <Button type="submit">Unlock Vault</Button>
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 w-full max-w-lg mx-auto p-4"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Model Name</Label>
        <Input
          id="name"
          placeholder="e.g. Space Marine Intercessor"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      {/* System & Faction Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System */}
        <div className="space-y-2">
          <Label htmlFor="system">System</Label>
          {!isCustomSystem ? (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={SYSTEMS.includes(systemValue as any) ? systemValue : ""}
              onChange={(e) => {
                if (e.target.value === "__OTHER__") {
                  setIsCustomSystem(true);
                  setValue("system", "");
                } else {
                  setValue("system", e.target.value);
                }
              }}
            >
              <option value="" disabled>
                Select System...
              </option>
              {SYSTEMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__OTHER__">Other / Custom...</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <Input
                id="system"
                placeholder="Type custom system..."
                autoFocus
                {...register("system")}
              />
              <Button
                type="button"
                variant="outline"
                className="px-3"
                onClick={() => setIsCustomSystem(false)}
              >
                List
              </Button>
            </div>
          )}
          {errors.system && (
            <p className="text-destructive text-sm">{errors.system.message}</p>
          )}
        </div>

        {/* Faction */}
        <div className="space-y-2">
          <Label htmlFor="faction">Faction</Label>
          {!isCustomFaction ? (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={FACTIONS.includes(factionValue as any) ? factionValue : ""}
              onChange={(e) => {
                if (e.target.value === "__OTHER__") {
                  setIsCustomFaction(true);
                  setValue("faction", "");
                } else {
                  setValue("faction", e.target.value);
                }
              }}
            >
              <option value="" disabled>
                Select Faction...
              </option>
              {FACTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              <option value="__OTHER__">Other / Custom...</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <Input
                id="faction"
                placeholder="Type custom faction..."
                autoFocus
                {...register("faction")}
              />
              <Button
                type="button"
                variant="outline"
                className="px-3"
                onClick={() => setIsCustomFaction(false)}
              >
                List
              </Button>
            </div>
          )}
          {errors.faction && (
            <p className="text-destructive text-sm">{errors.faction.message}</p>
          )}
        </div>
      </div>

      {/* Manufacturer */}
      <div className="space-y-2">
        <Label htmlFor="manufacturer">Manufacturer</Label>
        {!isCustomManufacturer ? (
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={
              MANUFACTURERS.includes(manufacturerValue as any)
                ? manufacturerValue
                : ""
            }
            onChange={(e) => {
              if (e.target.value === "__OTHER__") {
                setIsCustomManufacturer(true);
                setValue("manufacturer", ""); // Clear for typing
              } else {
                setValue("manufacturer", e.target.value);
              }
            }}
          >
            <option value="" disabled>
              Select Manufacturer...
            </option>
            {MANUFACTURERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value="__OTHER__">Other / Custom...</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <Input
              id="manufacturer"
              placeholder="Type custom manufacturer..."
              autoFocus
              {...register("manufacturer")}
            />
            <Button
              type="button"
              variant="outline"
              className="px-3"
              onClick={() => setIsCustomManufacturer(false)}
            >
              List
            </Button>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="space-y-2">
        <Label htmlFor="count">Count</Label>
        <Input
          id="count"
          type="number"
          min={1}
          {...register("count", { valueAsNumber: true })}
        />
        {errors.count && (
          <p className="text-destructive text-sm">{errors.count.message}</p>
        )}
      </div>

      {/* Toggles Grid */}
      <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300"
            {...register("assembled")}
          />
          <span>Assembled</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300"
            {...register("primed")}
          />
          <span>Primed</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300"
            {...register("painted")}
          />
          <span>Painted</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300"
            {...register("based")}
          />
          <span>Based</span>
        </label>
      </div>

      {/* Tags (Basic text input for now, split by comma) */}
      {/* Tags */}
      <div className="space-y-3">
        <Label>Tags</Label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => {
            const currentTags = field.value || [];

            const toggleTag = (tag: string) => {
              if (currentTags.includes(tag)) {
                field.onChange(currentTags.filter((t) => t !== tag));
              } else {
                field.onChange([...currentTags, tag]);
              }
            };

            // Available tags (helper to show what's common)
            // We'll show standard TAGS as toggles
            // Plus an input for custom tags

            return (
              <div className="space-y-3">
                {/* 1. Selected Tags (Pills) */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {currentTags.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {tag} ✕
                    </span>
                  ))}
                  {currentTags.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">
                      No tags selected.
                    </span>
                  )}
                </div>

                {/* 2. Custom Tag Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !currentTags.includes(val)) {
                          field.onChange([...currentTags, val]);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                </div>

                {/* 3. Suggestions Grid (Fun Tags) */}
                <div className="border rounded-md p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    Suggestions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS.map((tag) => {
                      const isSelected = currentTags.includes(tag);
                      if (isSelected) return null; // Already shown above
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="px-2 py-1 rounded-md text-xs border bg-background hover:bg-accent transition-colors"
                        >
                          + {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label>Photos</Label>
        <ImageUpload
          value={formFiles}
          onChange={setFormFiles}
          disabled={isSubmitting}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Paint recipe, conversion notes..."
          {...register("notes")}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Saving..." : "Save Model"}
      </Button>
    </form>
  );
}
