import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const TABS = ["Overview", "A/B tests", "Members", "Reports", "Video moderation"];

export default function Admin() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium text-ink">Admin dashboard</h1>
      <p className="mt-2 text-ink-soft">Moderation, analytics, and content controls.</p>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-ink text-linen" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "Overview" && <Overview />}
        {tab === "A/B tests" && <AbTests />}
        {tab === "Members" && <Members />}
        {tab === "Reports" && <Reports />}
        {tab === "Video moderation" && <VideoModeration />}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.getAnalyticsOverview().then(setData);
  }, []);
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total members" value={data.totalUsers} />
        <StatCard label="Verified" value={data.verifiedUsers} />
        <StatCard label="Suspended" value={data.suspendedUsers} />
        <StatCard label="New (7 days)" value={data.newUsersLast7d} />
        <StatCard label="Total matches" value={data.totalMatches} />
        <StatCard label="Mutual matches" value={data.mutualMatches} />
        <StatCard label="Mutual match rate" value={`${Math.round(data.mutualMatchRate * 100)}%`} />
        <StatCard label="Total messages" value={data.totalMessages} />
        <StatCard label="Open reports" value={data.openReports} />
        <StatCard label="Videos pending review" value={data.videosPending} />
      </div>

      <div className="card mt-6">
        <p className="font-display text-lg text-ink">Signups by method</p>
        <div className="mt-4 space-y-3">
          {data.signupBreakdown.map((s) => {
            const max = Math.max(...data.signupBreakdown.map((x) => x.count), 1);
            return (
              <div key={s.method}>
                <div className="mb-1 flex justify-between text-sm text-ink-soft">
                  <span>{s.method}</span>
                  <span>{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-ink/10">
                  <div
                    className="h-2 rounded-full bg-rose"
                    style={{ width: `${(s.count / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AbTests() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.getAbTestAnalytics().then((d) => setData(d.results));
  }, []);
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="card overflow-x-auto">
      <p className="mb-4 font-display text-lg text-ink">Matching-engine variant performance</p>
      <table className="w-full text-left text-sm">
        <thead className="text-ink-muted">
          <tr>
            <th className="pb-2">Variant</th>
            <th className="pb-2">Total matches</th>
            <th className="pb-2">Mutual matches</th>
            <th className="pb-2">Mutual rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.variant} className="border-t border-ink/10">
              <td className="py-2 font-medium text-ink">{r.variant}</td>
              <td className="py-2">{r.totalMatches}</td>
              <td className="py-2">{r.mutualMatches}</td>
              <td className="py-2">{Math.round(r.mutualRate * 100)}%</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-ink-muted">
                No match data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Members() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    const d = await api.getAdminUsers(q ? { q } : {});
    setData(d);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suspend = async (id, suspend) => {
    await api.suspendUser(id, { suspend });
    load();
  };
  const verify = async (id) => {
    await api.verifyUser(id);
    load();
  };

  return (
    <div className="card">
      <div className="mb-4 flex gap-2">
        <input
          className="field-input"
          placeholder="Search by email or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={load} className="btn-secondary">
          Search
        </button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-ink-muted">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Email / phone</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.users?.map((u) => (
            <tr key={u.id} className="border-t border-ink/10">
              <td className="py-2 font-medium text-ink">{u.profile?.fullName || "—"}</td>
              <td className="py-2 text-ink-soft">{u.email || u.phone}</td>
              <td className="py-2">
                {u.isSuspended ? (
                  <span className="rounded-full bg-rose/10 px-2 py-0.5 text-xs text-rose">Suspended</span>
                ) : u.isVerified ? (
                  <span className="rounded-full bg-sage/10 px-2 py-0.5 text-xs text-sage">Verified</span>
                ) : (
                  <span className="rounded-full bg-marigold/10 px-2 py-0.5 text-xs text-marigold">Unverified</span>
                )}
              </td>
              <td className="py-2">
                <div className="flex gap-2">
                  {!u.isVerified && (
                    <button onClick={() => verify(u.id)} className="btn-ghost">
                      Verify
                    </button>
                  )}
                  <button onClick={() => suspend(u.id, !u.isSuspended)} className="btn-ghost">
                    {u.isSuspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reports() {
  const [reports, setReports] = useState(null);

  const load = async () => {
    const d = await api.getReports("OPEN");
    setReports(d.reports);
  };
  useEffect(() => {
    load();
  }, []);

  const resolve = async (id, status) => {
    await api.resolveReport(id, { status });
    load();
  };

  return (
    <div className="space-y-3">
      {reports?.map((r) => (
        <div key={r.id} className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-ink">
                {r.reporter?.profile?.fullName} reported {r.reported?.profile?.fullName}
              </p>
              <p className="text-sm text-ink-soft">Reason: {r.reason}</p>
              {r.details && <p className="mt-1 text-sm text-ink-muted">{r.details}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => resolve(r.id, "RESOLVED")} className="btn-secondary">
                Resolve
              </button>
              <button onClick={() => resolve(r.id, "DISMISSED")} className="btn-ghost">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
      {reports && reports.length === 0 && (
        <div className="card text-center text-ink-muted">No open reports.</div>
      )}
    </div>
  );
}

function VideoModeration() {
  const [videos, setVideos] = useState(null);

  const load = async () => {
    const d = await api.getPendingVideos();
    setVideos(d.videos);
  };
  useEffect(() => {
    load();
  }, []);

  const moderate = async (userId, action) => {
    await api.moderateVideo(userId, { action });
    load();
  };

  return (
    <div className="space-y-3">
      {videos?.map((v) => (
        <div key={v.id} className="card flex items-center justify-between">
          <div>
            <p className="font-medium text-ink">{v.User?.profile?.fullName || v.userId}</p>
            <p className="text-sm text-ink-muted">Status: {v.status} · {(v.sizeBytes / 1024).toFixed(0)} KB</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => moderate(v.userId, "approve")} className="btn-secondary">
              Approve
            </button>
            <button onClick={() => moderate(v.userId, "remove")} className="btn-ghost">
              Remove
            </button>
          </div>
        </div>
      ))}
      {videos && videos.length === 0 && (
        <div className="card text-center text-ink-muted">No videos pending review.</div>
      )}
    </div>
  );
}
