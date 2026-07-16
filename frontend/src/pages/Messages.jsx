import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function Messages() {
  const { otherUserId } = useParams();
  return otherUserId ? <Thread otherUserId={otherUserId} /> : <Inbox />;
}

function Inbox() {
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getInbox()
      .then((d) => setConversations(d.conversations))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium text-ink">Messages</h1>
      {error && <div className="mt-4 rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose">{error}</div>}

      <div className="mt-8 divide-y divide-ink/10 overflow-hidden rounded-xl2 border border-ink/10 bg-white shadow-card">
        {conversations?.map((c) => (
          <Link
            key={c.partnerId}
            to={`/messages/${c.partnerId}`}
            className="flex items-center justify-between px-5 py-4 transition hover:bg-ink/5"
          >
            <div>
              <p className="font-medium text-ink">{c.partnerName}</p>
              <p className="truncate text-sm text-ink-muted">{c.lastMessage}</p>
            </div>
            {c.unread && <span className="h-2.5 w-2.5 rounded-full bg-rose" />}
          </Link>
        ))}
        {conversations && conversations.length === 0 && (
          <div className="px-5 py-8 text-center text-ink-muted">
            No conversations yet — messaging unlocks once you have a mutual match.
          </div>
        )}
      </div>
    </div>
  );
}

function Thread({ otherUserId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef();

  const load = async () => {
    try {
      const d = await api.getThread(otherUserId);
      setMessages(d.messages);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await api.sendMessage({ receiverId: otherUserId, body });
      setBody("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-72px)] max-w-2xl flex-col px-6 py-8">
      <Link to="/messages" className="mb-4 text-sm text-ink-muted hover:text-ink">
        ← All conversations
      </Link>
      {error && <div className="mb-4 rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose">{error}</div>}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl2 border border-ink/10 bg-white p-5 shadow-card">
        {messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-rose text-linen" : "bg-ink/5 text-ink"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          className="field-input"
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn-primary">Send</button>
      </form>
    </div>
  );
}
