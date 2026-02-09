import { useState, useEffect } from "react";
import { Button, Input } from "./ui";
import { Lock, Unlock, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AdminPage() {
  const [key, setKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("mini-vault-key");
    if (saved) {
      setIsUnlocked(true);
      setKey(saved);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      localStorage.setItem("mini-vault-key", key.trim());
      setIsUnlocked(true);
    }
  };

  const handleLock = () => {
    localStorage.removeItem("mini-vault-key");
    setIsUnlocked(false);
    setKey("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter">
          {isUnlocked ? "Vault Admin" : "Unlock Vault"}
        </h1>
        <p className="text-muted-foreground">
          {isUnlocked
            ? "You have full access to manage the collection."
            : "Enter your secret key to enable editing capabilities."}
        </p>
      </div>

      <div className="w-full max-w-sm p-6 bg-card border rounded-xl shadow-lg">
        {isUnlocked ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
              <Unlock className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => navigate("/")}
              >
                Go to Collection
              </Button>
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={handleLock}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Lock Vault
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="flex justify-center pb-4">
              <div className="p-4 bg-muted rounded-full">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter Vault Key..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
