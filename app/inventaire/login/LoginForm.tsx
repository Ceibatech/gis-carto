"use client";

import { useState } from "react";

export default function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/inventaire-ceiba/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Connexion impossible");
      window.location.href = "/inventaire";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Connexion Inventaire CEIBA">
        <div className="login-panel-head">
          <p className="panel-label">Inventaire CEIBA</p>
          <h1>Connexion</h1>
        </div>
        <form onSubmit={submit}>
          <label><span>Identifiant</span><input required value={login} onChange={(event) => setLogin(event.target.value)} /></label>
          <label><span>Mot de passe</span><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</button>
        </form>
      </section>
    </main>
  );
}
