import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { ModelForm } from "@/components/ModelForm";
import { ModelList } from "@/components/ModelList";
import { AdminPage } from "@/components/AdminPage";
import { ModelDetail } from "@/components/ModelDetail";
import { useEffect, useState } from "react";

function Layout() {
  const location = useLocation();
  const isListView = location.pathname === "/" || location.pathname === "/sell";
  const isSellPage = location.pathname === "/sell";

  // Check unlock status for header buttons
  const [isUnlocked, setIsUnlocked] = useState(false);
  useEffect(() => {
    // Basic check, could be improved with context or event listener for immediate updates
    const checkUnlock = () => {
      setIsUnlocked(!!localStorage.getItem("mini-vault-key"));
    };
    checkUnlock();
    // Poll or listen for storage events to update UI when admin unlocks
    window.addEventListener("storage", checkUnlock);
    // Also set interval for polling as storage event only fires across tabs usually
    const interval = setInterval(checkUnlock, 1000);
    return () => {
      window.removeEventListener("storage", checkUnlock);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4 pt-4 md:pt-10">
      <div
        className={`flex w-full flex-col items-center gap-6 ${isListView ? "max-w-7xl" : "max-w-lg"}`}
      >
        {/* Header / Nav */}
        <div className="flex w-full items-center justify-between pb-4 border-b">
          <Link to="/" className="cursor-pointer">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Mini Vault
            </h1>
            <p className="text-xs text-muted-foreground">Log your backlog.</p>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to={isSellPage ? "/" : "/sell"}
              className={`text-sm font-medium ${isSellPage ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"}`}
            >
              {isSellPage ? "View Collection" : "Sell Pile"}
            </Link>

            {isListView ? (
              isUnlocked ? (
                <Link
                  to="/add"
                  state={{ from: location }} // Pass location to preserve state on return? Handled in ModelList mostly
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                  + Add New
                </Link>
              ) : null
            ) : (
              <Link
                to="/" // This should ideally be "back"
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Back
              </Link>
            )}
          </div>
        </div>

        <div className="w-full">
          <Routes>
            <Route path="/" element={<ModelList />} />
            <Route path="/sell" element={<ModelList onlyForSale />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/model/:id" element={<ModelDetail />} />
            <Route
              path="/add"
              element={
                <div className="rounded-lg border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <ModelForm />
                </div>
              }
            />
            <Route
              path="/edit/:id"
              element={
                <div className="rounded-lg border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <ModelForm isEdit />
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
