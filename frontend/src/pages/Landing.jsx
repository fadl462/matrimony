import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

export default function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/search" replace />;

  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-4 font-body text-sm font-semibold uppercase tracking-widest text-rose">
            Matchmaking, made honest
          </p>
          <h1 className="font-display text-5xl font-medium leading-[1.05] text-ink md:text-6xl">
            Find someone who fits your life,
            <span className="italic text-rose"> not just your filters.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-soft">
            Kindred learns what you actually respond to — not just what you
            said you wanted on day one — and pairs it with a compatibility
            picture you can see, not just a score you have to trust.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/signup" className="btn-primary">
              Create your profile
            </Link>
            <Link to="/login" className="btn-secondary">
              I already have an account
            </Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm text-ink-muted">
            <div>
              <div className="font-display text-2xl text-ink">5</div>
              scored dimensions per match
            </div>
            <div>
              <div className="font-display text-2xl text-ink">3</div>
              ways to sign up
            </div>
            <div>
              <div className="font-display text-2xl text-ink">1</div>
              video profile, real personality
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="card">
            <p className="mb-4 font-display text-lg text-ink">Why Kindred is different</p>
            <ul className="space-y-4 text-sm text-ink-soft">
              <li className="flex gap-3">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-rose" />
                <span>
                  <strong className="text-ink">Adaptive matching.</strong> Every
                  like or pass nudges your weighting toward what you actually
                  respond to — interests, distance, horoscope, education,
                  lifestyle.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-marigold" />
                <span>
                  <strong className="text-ink">Video profiles.</strong> A
                  30-90 second clip says more than ten static photos ever
                  will.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-sage" />
                <span>
                  <strong className="text-ink">Messaging that's earned.</strong>{" "}
                  You only hear from people you've both said yes to — no cold
                  inboxes.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
