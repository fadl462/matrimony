import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Matches() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getMutualMatches()
      .then((d) => setMatches(d.results))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium text-ink">Your matches</h1>
      <p className="mt-2 text-ink-soft">Everyone here liked you back — go ahead and say hello.</p>

      {error && <div className="mt-4 rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose">{error}</div>}

      <div className="mt-8 space-y-3">
        {matches?.map((m) => (
          <div key={m.matchId} className="card flex items-center justify-between">
            <div>
              <p className="font-display text-lg text-ink">{m.otherUser.profile?.fullName}</p>
              <p className="text-sm text-ink-muted">{m.otherUser.profile?.city} · match score {Math.round(m.score)}</p>
            </div>
            <Link to={`/messages/${m.otherUser.id}`} className="btn-primary">
              Message
            </Link>
          </div>
        ))}
        {matches && matches.length === 0 && (
          <div className="card text-center text-ink-muted">
            No mutual matches yet — head to Discover and start liking profiles.
          </div>
        )}
      </div>
    </div>
  );
}
