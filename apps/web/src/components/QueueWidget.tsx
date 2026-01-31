import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type QueueItem, useUploadQueue } from "../context/UploadQueueContext";
import { Button } from "./ui";

interface QueueWidgetProps {
  onEdit: (item: QueueItem) => void;
}

export function QueueWidget({ onEdit }: QueueWidgetProps) {
  const { queue, retryItem, removeFromQueue, clearCompleted } =
    useUploadQueue();
  const [isExpanded, setIsExpanded] = useState(true);

  if (queue.length === 0) return null;

  const pendingCount = queue.filter((i) =>
    ["pending", "uploading_images", "saving"].includes(i.status),
  ).length;
  const errorCount = queue.filter((i) => i.status === "error").length;
  const successCount = queue.filter((i) => i.status === "success").length;

  const getStatusIcon = (status: QueueItem["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-4 h-4 rounded-full border-2 border-muted" />;
      case "uploading_images":
      case "saving":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (item: QueueItem) => {
    switch (item.status) {
      case "pending":
        return "Waiting...";
      case "uploading_images":
        return "Uploading photos...";
      case "saving":
        return "Saving data...";
      case "success":
        return "Saved!";
      case "error":
        return item.error || "Failed";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-xl overflow-hidden flex flex-col transition-all">
      {/* Header */}
      <div
        className="bg-muted px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/80"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {pendingCount > 0 ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : errorCount > 0 ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          )}
          <span>
            {pendingCount > 0
              ? `Syncing ${pendingCount} item${pendingCount > 1 ? "s" : ""}...`
              : errorCount > 0
                ? `${errorCount} Failed`
                : "All Synced"}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </div>

      {/* List */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto bg-card text-card-foreground">
          {queue.length > 0 && (
            <div className="divide-y divide-border">
              {queue.map((item) => (
                <div key={item.id} className="p-3 text-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="font-medium truncate max-w-[150px]"
                      title={item.data.name}
                    >
                      {item.data.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getStatusText(item)}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {item.status === "error" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => retryItem(item.id)}
                            title="Retry"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onEdit(item)}
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </>
                      )}

                      {(item.status === "success" ||
                        item.status === "error") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromQueue(item.id)}
                          title="Dismiss"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {successCount > 0 && pendingCount === 0 && (
            <div className="p-2 bg-muted/20 text-center">
              <Button
                variant="link"
                size="sm"
                onClick={clearCompleted}
                className="text-xs text-muted-foreground"
              >
                Clear Completed
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
