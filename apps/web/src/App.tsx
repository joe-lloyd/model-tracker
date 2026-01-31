import { ModelForm } from "@/components/ModelForm";

function App() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4 pt-10">
      <div className="flex w-full max-w-lg flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Mini Vault
          </h1>
          <p className="text-muted-foreground">Log your backlog.</p>
        </div>

        <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
          <ModelForm />
        </div>
      </div>
    </div>
  );
}

export default App;
