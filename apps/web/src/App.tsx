import { useState } from "react";
import { ModelForm } from "@/components/ModelForm";
import { ModelList } from "@/components/ModelList";

function App() {
  const [view, setView] = useState<"list" | "add">("list");

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4 pt-4 md:pt-10">
      <div
        className={`flex w-full flex-col items-center gap-6 ${view === "list" ? "max-w-7xl" : "max-w-lg"}`}
      >
        {/* Header / Nav */}
        <div className="flex w-full items-center justify-between pb-4 border-b">
          <div className="cursor-pointer" onClick={() => setView("list")}>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Mini Vault
            </h1>
            <p className="text-xs text-muted-foreground">Log your backlog.</p>
          </div>

          {view === "list" ? (
            <button
              onClick={() => setView("add")}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              + Add New
            </button>
          ) : (
            <button
              onClick={() => setView("list")}
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="w-full">
          {view === "list" ? (
            <ModelList onAddNew={() => setView("add")} />
          ) : (
            <div className="rounded-lg border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              <ModelForm onSuccess={() => setView("list")} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
