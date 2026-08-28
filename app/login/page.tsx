"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, FileText } from "lucide-react";
import { LoginBackground } from "./background";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [inflight, setInflight] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inflight) return;
    
    setInflight(true);
    setError("");
    
    try {
      await fetchApi("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred");
      }
      setInflight(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-canvas relative">
      <LoginBackground />
      <div className="w-full max-w-md bg-surface border border-border p-8 relative z-10 shadow-lg">
        <h1 className="font-space-grotesk font-semibold text-2xl text-heading mb-6 flex items-center gap-2">
          <span className="bg-accent rounded-full rounded-br-none p-1.5 shadow-sm flex items-center justify-center">
            <FileText className="w-5 h-5 text-surface" />
          </span>
          Sign In to EDIS DocSense
        </h1>
        
        {error && (
          <div className="mb-4 bg-danger/10 text-danger px-4 py-2 text-sm border border-danger/20">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
            <input 
              type="email"
              autoComplete="username" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border bg-canvas px-3 py-2 text-text focus:outline-none focus:border-accent"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border bg-canvas pl-3 pr-10 py-2 text-text focus:outline-none focus:border-accent"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none focus:text-accent"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={inflight}
            className="w-full bg-accent text-text-on-accent font-medium py-2 hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {inflight ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
