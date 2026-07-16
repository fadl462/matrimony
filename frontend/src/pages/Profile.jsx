import React, { useEffect, useState, useRef } from "react";
import { api, videoStreamUrl } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

const SECTIONS = ["Basics", "Preferences & weights", "Horoscope", "Interests", "Video profile"];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [section, setSection] = useState(SECTIONS[0]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium text-ink">My profile</h1>
      <p className="mt-2 text-ink-soft">
        The more complete this is, the better Kindred's matching engine can work for you.
      </p>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              section === s ? "bg-ink text-linen" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {section === "Basics" && <BasicsForm user={user} refreshUser={refreshUser} />}
        {section === "Preferences & weights" && <PreferencesForm user={user} refreshUser={refreshUser} />}
        {section === "Horoscope" && <HoroscopeForm user={user} refreshUser={refreshUser} />}
        {section === "Interests" && <InterestsForm user={user} refreshUser={refreshUser} />}
        {section === "Video profile" && <VideoForm user={user} refreshUser={refreshUser} />}
      </div>
    </div>
  );
}

function SavedBanner({ show }) {
  if (!show) return null;
  return <div className="mb-4 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">Saved.</div>;
}

function BasicsForm({ user, refreshUser }) {
  const p = user.profile || {};
  const [form, setForm] = useState({
    fullName: p.fullName || "",
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
    gender: p.gender || "OTHER",
    bio: p.bio || "",
    city: p.city || "",
    country: p.country || "",
    latitude: p.latitude ?? "",
    longitude: p.longitude ?? "",
    religion: p.religion || "",
    motherTongue: p.motherTongue || "",
    education: p.education || "",
    profession: p.profession || "",
    height_cm: p.height_cm ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form };
    if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
    ["latitude", "longitude", "height_cm"].forEach((k) => {
      payload[k] = payload[k] === "" ? undefined : Number(payload[k]);
    });
    Object.keys(payload).forEach((k) => payload[k] === "" && delete payload[k]);
    try {
      await api.updateProfile(payload);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-5">
      <SavedBanner show={saved} />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="field-label">Full name</label>
          <input className="field-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Date of birth</label>
          <input type="date" className="field-input" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Gender</label>
          <select className="field-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="field-label">City</label>
          <input className="field-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Country</label>
          <input className="field-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Latitude</label>
            <input type="number" step="any" className="field-input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Longitude</label>
            <input type="number" step="any" className="field-input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="field-label">Religion</label>
          <input className="field-input" value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Mother tongue</label>
          <input className="field-input" value={form.motherTongue} onChange={(e) => setForm({ ...form, motherTongue: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Education</label>
          <input className="field-input" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Profession</label>
          <input className="field-input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Height (cm)</label>
          <input type="number" className="field-input" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="field-label">About you</label>
        <textarea rows={4} className="field-input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>
      <button className="btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save basics"}
      </button>
    </form>
  );
}

function WeightSlider({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="field-label mb-0">{label}</label>
        <span className="text-sm text-ink-muted">{value.toFixed(2)}×</span>
      </div>
      <input
        type="range"
        min={0}
        max={3}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-rose"
      />
    </div>
  );
}

function PreferencesForm({ user, refreshUser }) {
  const pref = user.preference || {};
  const [form, setForm] = useState({
    minAge: pref.minAge ?? 24,
    maxAge: pref.maxAge ?? 38,
    maxDistanceKm: pref.maxDistanceKm ?? 100,
    horoscopeMatchRequired: pref.horoscopeMatchRequired ?? false,
    weightInterests: pref.weightInterests ?? 1,
    weightLocation: pref.weightLocation ?? 1,
    weightHoroscope: pref.weightHoroscope ?? 1,
    weightEducation: pref.weightEducation ?? 0.5,
    weightLifestyle: pref.weightLifestyle ?? 0.5,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updatePreferences(form);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-6">
      <SavedBanner show={saved} />
      <div>
        <p className="font-display text-lg text-ink">Search range</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <div>
            <label className="field-label">Min age</label>
            <input type="number" className="field-input" value={form.minAge} onChange={(e) => setForm({ ...form, minAge: Number(e.target.value) })} />
          </div>
          <div>
            <label className="field-label">Max age</label>
            <input type="number" className="field-input" value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: Number(e.target.value) })} />
          </div>
          <div>
            <label className="field-label">Max distance (km)</label>
            <input type="number" className="field-input" value={form.maxDistanceKm} onChange={(e) => setForm({ ...form, maxDistanceKm: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div>
        <p className="font-display text-lg text-ink">Matching weights</p>
        <p className="mt-1 text-sm text-ink-muted">
          These shift automatically as you like and pass profiles, but you can also set them directly.
        </p>
        <div className="mt-4 space-y-4">
          <WeightSlider label="Interests" value={form.weightInterests} onChange={(v) => setForm({ ...form, weightInterests: v })} />
          <WeightSlider label="Location" value={form.weightLocation} onChange={(v) => setForm({ ...form, weightLocation: v })} />
          <WeightSlider label="Horoscope" value={form.weightHoroscope} onChange={(v) => setForm({ ...form, weightHoroscope: v })} />
          <WeightSlider label="Education" value={form.weightEducation} onChange={(v) => setForm({ ...form, weightEducation: v })} />
          <WeightSlider label="Lifestyle (religion, language)" value={form.weightLifestyle} onChange={(v) => setForm({ ...form, weightLifestyle: v })} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={form.horoscopeMatchRequired}
          onChange={(e) => setForm({ ...form, horoscopeMatchRequired: e.target.checked })}
        />
        Require horoscope compatibility
      </label>

      <button className="btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}

function HoroscopeForm({ user, refreshUser }) {
  const h = user.horoscope || {};
  const [form, setForm] = useState({
    birthTime: h.birthTime || "",
    birthPlace: h.birthPlace || "",
    moonSign: h.moonSign || "",
    star: h.star || "",
    manglikStatus: h.manglikStatus || "unknown",
    gunaScore: h.gunaScore ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form };
    payload.gunaScore = payload.gunaScore === "" ? undefined : Number(payload.gunaScore);
    try {
      await api.updateHoroscope(payload);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-5">
      <SavedBanner show={saved} />
      <p className="text-sm text-ink-muted">
        Optional. Used only if you weight horoscope compatibility in your preferences —
        this is a simplified heuristic, not a substitute for a full Vedic reading.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="field-label">Birth time</label>
          <input className="field-input" placeholder="e.g. 14:32" value={form.birthTime} onChange={(e) => setForm({ ...form, birthTime: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Birth place</label>
          <input className="field-input" value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Moon sign (Rashi)</label>
          <input className="field-input" value={form.moonSign} onChange={(e) => setForm({ ...form, moonSign: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Star (Nakshatra)</label>
          <input className="field-input" value={form.star} onChange={(e) => setForm({ ...form, star: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Manglik status</label>
          <select className="field-input" value={form.manglikStatus} onChange={(e) => setForm({ ...form, manglikStatus: e.target.value })}>
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div>
          <label className="field-label">Guna score (0-36)</label>
          <input type="number" min={0} max={36} className="field-input" value={form.gunaScore} onChange={(e) => setForm({ ...form, gunaScore: e.target.value })} />
        </div>
      </div>
      <button className="btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save horoscope details"}
      </button>
    </form>
  );
}

function InterestsForm({ user, refreshUser }) {
  const SUGGESTIONS = ["music", "travel", "cooking", "reading", "football", "fitness", "movies", "photography", "hiking", "yoga", "art", "dancing"];
  const [selected, setSelected] = useState((user.interests || []).map((i) => (typeof i === "string" ? i : i.name)));
  const [custom, setCustom] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (name) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const addCustom = () => {
    const name = custom.trim().toLowerCase();
    if (name && !selected.includes(name)) setSelected([...selected, name]);
    setCustom("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateInterests({ interests: selected });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-5">
      <SavedBanner show={saved} />
      <p className="text-sm text-ink-muted">Pick as many as apply — this feeds the "Interests" dimension of your match score.</p>
      <div className="flex flex-wrap gap-2">
        {Array.from(new Set([...SUGGESTIONS, ...selected])).map((name) => (
          <button
            type="button"
            key={name}
            onClick={() => toggle(name)}
            className={`rounded-full border px-3.5 py-1.5 text-sm capitalize transition ${
              selected.includes(name) ? "border-rose bg-rose text-linen" : "border-ink/15 text-ink-soft"
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="field-input"
          placeholder="Add your own…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
        />
        <button type="button" onClick={addCustom} className="btn-secondary">
          Add
        </button>
      </div>
      <button className="btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save interests"}
      </button>
    </form>
  );
}

function VideoForm({ user }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const pollRef = useRef();

  useEffect(() => {
    fetchStatus();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatus = async () => {
    try {
      const s = await api.getVideoStatus();
      setStatus(s);
      if (s.status === "processing") {
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          const updated = await api.getVideoStatus().catch(() => null);
          if (updated) {
            setStatus(updated);
            if (updated.status !== "processing") clearInterval(pollRef.current);
          }
        }, 2000);
      }
    } catch {
      setStatus(null);
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("video", file);
    try {
      await api.uploadVideo(formData);
      await fetchStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card space-y-5">
      <p className="font-display text-lg text-ink">Video profile</p>
      <p className="text-sm text-ink-muted">
        A short 30–90 second clip — introduce yourself, talk about what
        matters to you. MP4, MOV, or WebM, up to 100MB.
      </p>
      {error && <div className="rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose">{error}</div>}

      {status?.status === "ready" && (
        <video controls className="aspect-video w-full max-w-md rounded-xl2 bg-ink" src={videoStreamUrl(user.id)} />
      )}
      {status?.status === "processing" && (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-marigold" />
          Processing your video — this usually takes a few seconds…
        </div>
      )}
      {status?.moderationFlag && (
        <div className="rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose">
          This video didn't pass moderation review. Upload a new one.
        </div>
      )}

      <div>
        <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={onUpload} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary" disabled={uploading}>
          {uploading ? "Uploading…" : status ? "Replace video" : "Upload video"}
        </button>
      </div>
    </div>
  );
}
