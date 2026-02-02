import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ModelInputSchema,
  type ModelInput,
  type Model,
  SYSTEMS,
  FACTIONS,
  MANUFACTURERS,
  TAGS,
} from "@mini-vault/shared";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { ImageUpload } from "./ImageUpload";
import { Input, Button, Label, Textarea } from "./ui";
import { uploadToCloudinary } from "@/lib/cloudinary";

export function ModelForm({
  onSuccess,
  isEdit = false,
}: {
  onSuccess?: () => void;
  isEdit?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // Try to get model from state (passed from List)
  const existingModel = location.state?.model as Model | undefined;

  // Custom mode state
  const [isCustomSystem, setIsCustomSystem] = useState(false);
  const [isCustomFaction, setIsCustomFaction] = useState(false);
  const [isCustomManufacturer, setIsCustomManufacturer] = useState(false);

  // Dynamic Options State (Initialized with defaults)
  const [availableSystems, setAvailableSystems] = useState<string[]>([
    ...SYSTEMS,
  ]);
  const [availableFactions, setAvailableFactions] = useState<string[]>([
    ...FACTIONS,
  ]);
  const [availableManufacturers, setAvailableManufacturers] = useState<
    string[]
  >([...MANUFACTURERS]);
  const [availableTags, setAvailableTags] = useState<string[]>([...TAGS]);

  // Fetch dynamic stats on mount
  useEffect(() => {
    async function fetchFacets() {
      try {
        const res = await fetch("/.netlify/functions/get-models?limit=0");
        if (res.ok) {
          const json = await res.json();
          if (json.facets) {
            setAvailableSystems((prev) =>
              Array.from(
                new Set([...prev, ...(json.facets.systems || [])]),
              ).sort(),
            );
            setAvailableFactions((prev) =>
              Array.from(
                new Set([...prev, ...(json.facets.factions || [])]),
              ).sort(),
            );
            setAvailableManufacturers((prev) =>
              Array.from(
                new Set([...prev, ...(json.facets.manufacturers || [])]),
              ).sort(),
            );
            setAvailableTags((prev) =>
              Array.from(
                new Set([...prev, ...(json.facets.tags || [])]),
              ).sort(),
            );
          }
        }
      } catch (e) {
        console.error("Failed to fetch facets", e);
      }
    }
    fetchFacets();
  }, []);

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
      forSale: false,
      tags: [],
      images: [],
    },
  });

  // Pre-fill data if Editing
  useEffect(() => {
    if (isEdit && existingModel) {
      // We are in edit mode and have data
      setValue("name", existingModel.name);
      setValue("system", existingModel.system as any);
      setValue("faction", existingModel.faction as any);
      setValue("manufacturer", (existingModel.manufacturer || "") as any);
      setValue("count", existingModel.count);
      setValue("notes", existingModel.notes);
      setValue("tags", existingModel.tags);
      setValue("painted", existingModel.painted);
      setValue("assembled", existingModel.assembled);
      setValue("primed", existingModel.primed);
      setValue("based", existingModel.based);
      setValue("forSale", existingModel.forSale ?? false);
      setValue("images", existingModel.images);

      // Handle custom fields
      if (
        existingModel.system &&
        !availableSystems.includes(existingModel.system as any)
      )
        setIsCustomSystem(true);
      if (
        existingModel.faction &&
        !availableFactions.includes(existingModel.faction as any)
      )
        setIsCustomFaction(true);
      if (
        existingModel.manufacturer &&
        !availableManufacturers.includes(
          (existingModel.manufacturer || "") as any,
        )
      )
        setIsCustomManufacturer(true);
    } else if (!isEdit) {
      // 1. Load localstorage data only if CREATING new
      const saved = localStorage.getItem("model-tracker-form");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach((key) => {
            if (key !== "images") {
              setValue(key as any, parsed[key]);
            }
          });
          if (parsed.system && !availableSystems.includes(parsed.system))
            setIsCustomSystem(true);
          if (parsed.faction && !availableFactions.includes(parsed.faction))
            setIsCustomFaction(true);
          if (
            parsed.manufacturer &&
            !availableManufacturers.includes(parsed.manufacturer)
          )
            setIsCustomManufacturer(true);
        } catch (e) {
          console.error("Failed to load saved form", e);
        }
      }
    }
  }, [
    isEdit,
    existingModel,
    setValue,
    availableSystems,
    availableFactions,
    availableManufacturers,
  ]);

  useEffect(() => {
    // 2. Save data on change (only for new forms to prevent overwriting draft with edit data)
    if (!isEdit) {
      const subscription = watch((value) => {
        localStorage.setItem("model-tracker-form", JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, isEdit]);

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
      const newImageUrls = uploadResults.map((r) => r.secure_url);

      const finalData: any = {
        ...data,
        images: [...(data.images || []), ...newImageUrls], // Append new images to existing
      };

      // Ensure we pass ID if editing
      if (isEdit && existingModel) {
        finalData.id = existingModel.id;
        finalData.createdAt = existingModel.createdAt;
      }

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
        /* Not JSON */
      }

      if (!response.ok) {
        let errorMessage = "Failed to save model";
        if (response.status === 401) {
          errorMessage = "Unauthorized! Check your Vault Key.";
          setIsLocked(true);
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

      if (!result)
        throw new Error("Server succeeded but returned no JSON data");

      console.log("Success:", result);

      reset();
      setFormFiles([]);
      if (!isEdit) {
        localStorage.removeItem("model-tracker-form");
      }

      if (onSuccess) onSuccess();
      else navigate("/"); // Default back to home
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
          Enter your secret key to enable {isEdit ? "editing" : "adding"}{" "}
          models.
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

  // If editing but no model data found (e.g. direct URL visit without state),
  // we should ideally fetch it. For now, show a helpful message.
  if (isEdit && !existingModel && !id) {
    return (
      <div className="text-center p-8">
        Error: No model data found. Please select a model from the list.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 w-full max-w-lg mx-auto p-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {isEdit ? "Edit Model" : "Add New Model"}
        </h2>
      </div>

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
              value={
                availableSystems.includes(systemValue as any) ? systemValue : ""
              }
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
              {availableSystems.map((s) => (
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
              value={
                availableFactions.includes(factionValue as any)
                  ? factionValue
                  : ""
              }
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
              {availableFactions.map((f) => (
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
              availableManufacturers.includes(manufacturerValue as any)
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
            {availableManufacturers.map((m) => (
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
      <Label>Status</Label>
      <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-400 accent-green-600 cursor-pointer"
            {...register("assembled")}
          />
          <span>Assembled</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-400 accent-green-600 cursor-pointer"
            {...register("primed")}
          />
          <span>Primed</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-400 accent-green-600 cursor-pointer"
            {...register("painted")}
          />
          <span>Painted</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-400 accent-green-600 cursor-pointer"
            {...register("based")}
          />
          <span>Based</span>
        </label>
      </div>

      {/* For Sale Toggle */}
      <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-6 h-6 rounded border-red-500 accent-red-600"
            {...register("forSale")}
          />
          <div className="flex flex-col">
            <span className="font-bold text-red-800 dark:text-red-400">
              Mark For Sale
            </span>
            <span className="text-xs text-red-600/80 dark:text-red-400/70">
              Review this item in the Sell Pile
            </span>
          </div>
        </label>
      </div>

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
                    {availableTags.map((tag) => {
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
        {isEdit && existingModel?.images?.length ? (
          <div className="mb-2 grid grid-cols-4 gap-2">
            {existingModel.images.map((img, i) => (
              <img
                key={i}
                src={img}
                className="rounded-md w-full h-20 object-cover border"
              />
            ))}
          </div>
        ) : null}
        <ImageUpload
          value={formFiles}
          onChange={setFormFiles}
          disabled={isSubmitting}
        />
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            New photos will be added to existing ones.
          </p>
        )}
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
