import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { type ModelInput } from "@mini-vault/shared";
import { uploadToCloudinary } from "@/lib/cloudinary";

export type QueueItemStatus =
  | "pending"
  | "uploading_images"
  | "saving"
  | "success"
  | "error";

export interface QueueItem {
  id: string; // Random client-side ID
  data: ModelInput;
  files: File[];
  status: QueueItemStatus;
  error?: string;
  vaultKey: string; // Capture auth key at moment of submission
}

interface UploadQueueContextType {
  queue: QueueItem[];
  addToQueue: (data: ModelInput, files: File[], vaultKey: string) => void;
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  removeFromQueue: (id: string) => void;
  isProcessing: boolean;
}

const UploadQueueContext = createContext<UploadQueueContextType | null>(null);

export function UploadQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref to track if a loop is already running so we don't start double workers
  const processingRef = useRef(false);

  const addToQueue = (data: ModelInput, files: File[], vaultKey: string) => {
    const newItem: QueueItem = {
      id: crypto.randomUUID(),
      data,
      files,
      vaultKey,
      status: "pending",
    };
    setQueue((prev) => [...prev, newItem]);
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const retryItem = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "pending", error: undefined }
          : item,
      ),
    );
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "success"));
  };

  const updateItemStatus = (
    id: string,
    status: QueueItemStatus,
    error?: string,
  ) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, error } : item)),
    );
  };

  // The Processor Worker
  useEffect(() => {
    const processQueue = async () => {
      if (processingRef.current) return; // Already running

      const nextItem = queue.find((item) => item.status === "pending");
      if (!nextItem) {
        setIsProcessing(false);
        return;
      }

      processingRef.current = true;
      setIsProcessing(true);

      try {
        // Step 1: Upload Images
        updateItemStatus(nextItem.id, "uploading_images");

        // Check if images are already uploaded (if this is a retry and we saved them?
        // For simplicity, we re-upload on retry or assuming files are still File objects)
        // Ideally we would optimize this, but Cloudinary handles dupes reasonably well if filenames match?
        // Actually, let's just upload.

        const uploadPromises = nextItem.files.map((file) =>
          uploadToCloudinary(file),
        );
        const uploadResults = await Promise.all(uploadPromises);
        const imageUrls = uploadResults.map((r) => r.secure_url);

        // Step 2: Save Data
        updateItemStatus(nextItem.id, "saving");

        const finalData = {
          ...nextItem.data,
          images: imageUrls,
        };

        const response = await fetch("/.netlify/functions/submit-model", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vault-key": nextItem.vaultKey,
          },
          body: JSON.stringify(finalData),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        updateItemStatus(nextItem.id, "success");
      } catch (err: any) {
        console.error("Queue Processing Error", err);
        updateItemStatus(nextItem.id, "error", err.message || "Unknown error");
      } finally {
        processingRef.current = false;
        // Trigger next loop immediately
        // We use a timeout to let React state settle and allow UI updates
        setTimeout(() => {
          // This effect will naturally re-run because 'queue' changed (status update)
          // But just in case, we rely on the dependency array
        }, 100);
      }
    };

    processQueue();
  }, [queue]); // Dependency on queue ensures we keep processing as long as there are pending items

  return (
    <UploadQueueContext.Provider
      value={{
        queue,
        addToQueue,
        retryItem,
        clearCompleted,
        removeFromQueue,
        isProcessing,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error("useUploadQueue must be used within a UploadQueueProvider");
  }
  return context;
}
