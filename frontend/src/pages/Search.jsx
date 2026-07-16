import React, { useState } from "react";
import { api } from "../api/client";
import MatchScoreRing, { MatchScoreLegend } from "../components/MatchScoreRing.jsx";

function ageFromDob(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function Search() {
  const [filters, setFilters] = useState({
    minAge: "",
    maxAge: "",
    city: "",
    interests: "",
    religion: "",
    moonSign: "",
    manglikStatus: "",
    maxDistanceKm: "",
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({}); // id -> "liked" | "passed" | "mutual"

  const runSearch = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
      const data = await api.search(params);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (targetUserId, action) => {
    try {
      const res = await api.matchAction({ targetUserId, action });
      setActionState((prev) => ({ ...prev, [targetUserId]: res.mutualLike ? "mutual" : action }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium text-ink">Discover</h1>
      <p className="mt-2 text-ink-soft">
        Filter by interests, distance, or horoscope — every result is scored across all five, weighted to your preferences.
      </p>

      <form onSubmit={runSearch} className="card mt-6 grid gap-4 md:grid-cols-4">
        <div>
          <label className="field-label">Min age</label>
          <input type="number" className="field-input" value={filters.minAge} onChange={(e) => setFilters({ ...filters, minAge: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Max age</label>
          <input type="number" className="field-input" value={filters.maxAge} onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })} />
        </div>
        <div>
          <label className="field-label">City</label>
          <input className="field-input" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Max distance (km)</label>
          <input type="number" className="field-input" value={filters.maxDistanceKm} onChange={(e) => setFilters({ ...filters, maxDistanceKm: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Interests (comma-separated)</label>
          <input className="field-input" placeholder="music, travel" value={filters.interests} onChange={(e) => setFilters({ ...filters, interests: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Religion</label>
          <input className="field-input" value={filters.religion} onChange={(e) => setFilters({ ...filters, religion: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Moon sign</label>
          <input className="field-input" value={filters.moonSign} onChange={(e) => setFilters({ ...filters, moonSign: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Manglik status</label>
          <select className="field-input" value={filters.manglikStatus} onChange={(e) => setFilters({ ...filters, manglikStatus: e.target.value })}>
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <button className="btn-primary" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && <div className="mt-4 rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose">{error}</div>}

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {results?.results?.map((r) => {
          const state = actionState[r.id];
          const age = ageFromDob(r.profile?.dateOfBirth);
          return (
            <div key={r.id} className="card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl text-ink">{r.profile?.fullName}</p>
                  <p className="text-sm text-ink-muted">
                    {age ? `${age} · ` : ""}
                    {r.profile?.city}
                    {r.distanceKm !== null ? ` · ${r.distanceKm} km away` : ""}
                  </p>
                  {r.profile?.education && <p className="mt-1 text-sm text-ink-soft">{r.profile.education}</p>}
                  {r.interests?.length > 0 && (
                    <p className="mt-2 text-xs text-ink-muted">{r.interests.join(" · ")}</p>
                  )}
                  {r.videoAvailable && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-marigold/15 px-2.5 py-1 text-xs font-medium text-marigold">
                      ▶ Video profile
                    </span>
                  )}
                </div>
                <MatchScoreRing score={r.score} breakdown={r.breakdown} size={92} />
              </div>

              <MatchScoreLegend breakdown={r.breakdown} />

              <div className="mt-auto flex gap-2 pt-2">
                {state === "mutual" ? (
                  <span className="btn-primary w-full cursor-default bg-sage">It's a match! 🎉</span>
                ) : state === "liked" ? (
                  <span className="btn-secondary w-full cursor-default">Liked — waiting on them</span>
                ) : state === "passed" ? (
                  <span className="btn-ghost w-full cursor-default">Passed</span>
                ) : (
                  <>
                    <button onClick={() => act(r.id, "passed")} className="btn-secondary flex-1">
                      Pass
                    </button>
                    <button onClick={() => act(r.id, "liked")} className="btn-primary flex-1">
                      Like
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {results && results.results.length === 0 && (
        <div className="card mt-8 text-center text-ink-muted">
          No members match these filters yet — try widening your distance or age range.
        </div>
      )}
    </div>
  );
}
