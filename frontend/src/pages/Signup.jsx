import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = [
  { key: "email", label: "Email" },
  { key: "oauth", label: "Google / Facebook" },
  { key: "phone", label: "Phone number" },
];

export default function Signup() {
  const [tab, setTab] = useState("email");
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-medium text-ink">Join Kindred</h1>
      <p className="mt-2 text-ink-soft">Pick whichever's fastest for you.</p>

      <div className="mt-6 flex gap-1 rounded-full bg-ink/5 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-white text-ink shadow-card" : "text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "email" && <EmailSignup onDone={loginWithToken} navigate={navigate} />}
        {tab === "oauth" && <OAuthSignup onDone={loginWithToken} navigate={navigate} />}
        {tab === "phone" && <PhoneSignup onDone={loginWithToken} navigate={navigate} />}
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Already a member?{" "}
        <Link to="/login" className="font-medium text-rose">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="mb-4 rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose" role="alert">
      {error}
    </div>
  );
}

function EmailSignup({ onDone, navigate }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.signupEmail(form);
      await onDone(token);
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner error={error} />
      <div>
        <label className="field-label">Full name</label>
        <input
          required
          className="field-input"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">Email</label>
        <input
          required
          type="email"
          className="field-input"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">Password</label>
        <input
          required
          type="password"
          minLength={8}
          className="field-input"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <p className="mt-1 text-xs text-ink-muted">At least 8 characters.</p>
      </div>
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function OAuthSignup({ onDone, navigate }) {
  const [provider, setProvider] = useState("google");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // In production this screen wouldn't exist — clicking "Continue with
      // Google" would redirect to Google's consent screen and the backend
      // would verify the returned ID token (see services/oauth.js). Since
      // this environment has no live OAuth app credentials, we simulate the
      // "provider already verified this person" step with a small form.
      const { token } = await api.oauthCallback({
        provider,
        mockProfile: { providerId: `${provider}-${email}`, email, name },
      });
      await onDone(token);
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner error={error} />
      <div className="rounded-lg bg-marigold/10 px-4 py-3 text-xs text-ink-soft">
        Demo mode: real deployments redirect straight to the provider's login
        screen with no form. This stands in for that until real Google/Facebook
        app credentials are configured (see backend .env.example).
      </div>
      <div>
        <label className="field-label">Provider</label>
        <div className="flex gap-2">
          {["google", "facebook"].map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setProvider(p)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium capitalize transition ${
                provider === p ? "border-ink bg-ink text-linen" : "border-ink/15 text-ink-soft"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="field-label">Name (from provider)</label>
        <input required className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Email (from provider)</label>
        <input
          required
          type="email"
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Connecting…" : `Continue with ${provider === "google" ? "Google" : "Facebook"}`}
      </button>
    </form>
  );
}

function PhoneSignup({ onDone, navigate }) {
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devHint, setDevHint] = useState("");

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.requestOtp({ phone });
      setUserId(res.userId);
      setDevHint("Demo mode: no SMS provider is configured, so the code was written to the backend server log instead of your phone (see services/sms.js).");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.verifyOtp({ userId, code });
      await onDone(token);
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <form onSubmit={requestOtp} className="space-y-4">
        <ErrorBanner error={error} />
        <div>
          <label className="field-label">Phone number (with country code)</label>
          <input
            required
            placeholder="+233 24 123 4567"
            className="field-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Sending…" : "Send verification code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <ErrorBanner error={error} />
      {devHint && <div className="rounded-lg bg-marigold/10 px-4 py-3 text-xs text-ink-soft">{devHint}</div>}
      <div>
        <label className="field-label">6-digit code</label>
        <input
          required
          maxLength={6}
          className="field-input tracking-[0.3em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Verifying…" : "Verify & continue"}
      </button>
    </form>
  );
}
