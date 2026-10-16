"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
export default function LoginPage() { 
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    setLoading(true); 
    try {
      const result = await api<{ 
        token: string;
        user: unknown 
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email, password }) });
      localStorage.setItem("retailstock_token", result.token);
      localStorage.setItem("retailstock_user", JSON.stringify(result.user));
      router.push("/");
    } 
    catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } 
    finally {
      setLoading(false); }
  } return <main className="login-page"><div className="login-brand">
    <span className="brand-mark">RS</span>
    <span className="eyebrow">Retail operations</span
                                               ><h1>Stock you can trust.</h1>
    <p>See what moved, what is low, and what can sell next.</p>
  </div>
    <form className="login-card" onSubmit={submit}><span className="eyebrow">Secure stockroom</span><h2>Sign in to the ledger.</h2>
      <p className="muted">Use your provisioned Admin or Staff account.</p>
      <label>Email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
      </label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required /></label>
     <p className="muted">Password must be at least 6 characters.</p>
    {error && <div className="alert error" role="alert">{error}</div>}<button className="primary-button full" disabled={loading}>{loading ? "Checking credentials…" : "Open stockroom"}</button></form></main>; }
