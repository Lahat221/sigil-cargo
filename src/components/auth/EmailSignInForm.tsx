"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function EmailSignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Identifiant ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    window.location.assign(next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        required
        placeholder="Identifiant (email)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md border border-line bg-navy/40 px-3 py-2 text-sm text-white placeholder:text-muted2 focus:border-gold-1 focus:outline-none"
      />
      <input
        type="password"
        required
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-md border border-line bg-navy/40 px-3 py-2 text-sm text-white placeholder:text-muted2 focus:border-gold-1 focus:outline-none"
      />

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
