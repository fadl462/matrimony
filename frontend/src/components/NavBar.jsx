import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm font-medium transition ${
          isActive ? "bg-ink text-linen" : "text-ink-soft hover:bg-ink/5"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-linen/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-ink">
          Kindred
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 md:flex">
            <NavItem to="/search">Discover</NavItem>
            <NavItem to="/matches">Matches</NavItem>
            <NavItem to="/messages">Messages</NavItem>
            <NavItem to="/profile">My profile</NavItem>
            {(user.role === "ADMIN" || user.role === "MODERATOR") && (
              <NavItem to="/admin">Admin</NavItem>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="btn-ghost"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary">
                Join Kindred
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
