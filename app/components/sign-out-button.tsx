"use client";

import { fetchApi } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [inflight, setInflight] = useState(false);

  const handleSignOut = async () => {
    if (inflight) return;
    setInflight(true);
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors on logout
    } finally {
      setInflight(false);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <button 
      onClick={handleSignOut} 
      disabled={inflight}
      className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-canvas transition-colors w-full text-left"
    >
      <LogOut className="h-4 w-4" />
      <span>Sign Out</span>
    </button>
  );
}
