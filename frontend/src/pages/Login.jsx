import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.loginEmail({ email, password });
      await loginWithToken(token);
      navigate("/search");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-medium text-ink">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Sign in with your email and password.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose" role="alert">
            {error}
          </div>
        )}
        <div>
          <label className="field-label">Email</label>
          <input
            required
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input
            required
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-lg bg-ink/5 px-4 py-3 text-xs text-ink-muted">
        Demo accounts (seeded): <strong>ama@example.com</strong> /{" "}
        <strong>Password123!</strong> — or any of the other seeded members.
        Admin: <strong>admin@matrimony.local</strong> / <strong>AdminPass123!</strong>
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link to="/signup" className="font-medium text-rose">
          Create an account
        </Link>
      </p>
    </div>
  );
}
