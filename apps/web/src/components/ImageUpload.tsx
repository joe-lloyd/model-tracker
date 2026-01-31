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
      <div className="flex gap-4 w-full">
        {/* Gallery / Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
            isDragActive
              ? "border-primary bg-muted/50"
              : "border-muted-foreground/25",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
          <p className="text-xs text-center text-muted-foreground font-medium">
            Select Images
          </p>
        </div>

        {/* Camera Button (Hidden Input) */}
        <div
          className={cn(
            "flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          onClick={() => {
            if (disabled) return;
            // Trigger camera input
            const camInput = document.getElementById("camera-input");
            if (camInput) camInput.click();
          }}
        >
          <input
            id="camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                onChange([...value, ...files]);
                // Reset value so we can take another photo of same thing if needed
                e.target.value = "";
              }
            }}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 mb-2 text-muted-foreground"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          <p className="text-xs text-center text-muted-foreground font-medium">
            Take Photo
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
