import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: File[];
  onChange: (value: File[]) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  // Create previews when files change
  useEffect(() => {
    const newPreviews = value.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);

    // Cleanup URLs on unmount or when files change
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [value]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onChange([...value, ...acceptedFiles]);
    },
    [value, onChange],
  );

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    disabled: disabled,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
          isDragActive
            ? "border-primary bg-muted/50"
            : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <input {...getInputProps({ capture: "environment" })} />{" "}
        {/* Mobile capture hint */}
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Tap to upload</span> or drag and
            drop
          </p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {previews.map((url, index) => (
            <div key={url} className="relative aspect-square group">
              <img
                src={url}
                alt={`Preview ${index}`}
                className="w-full h-full object-cover rounded-md"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
