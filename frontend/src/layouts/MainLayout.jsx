import { useState, useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchModal from "../components/SearchModal";

function MainLayout() {
  const { isAuthenticated, user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinkClass = ({ isActive }) =>
    isActive
      ? "font-semibold text-slate-900"
      : "text-slate-600 hover:text-slate-900";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-lg font-semibold tracking-tight">
              Learning Intelligence Platform
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition-colors"
              >
                <span>🔍</span>
                <span>Search...</span>
                <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200">
                  Ctrl K
                </kbd>
              </button>
            )}
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/goals" className={navLinkClass}>
                  Goals
                </NavLink>
                <NavLink to="/tasks" className={navLinkClass}>
                  Tasks
                </NavLink>
                <NavLink to="/study-sessions" className={navLinkClass}>
                  Study Sessions
                </NavLink>
                <NavLink to="/resources" className={navLinkClass}>
                  Resources
                </NavLink>
                <NavLink to="/notes" className={navLinkClass}>
                  Notes
                </NavLink>
                <NavLink to="/ai/chat" className={navLinkClass}>
                  AI Chat
                </NavLink>
                <NavLink to="/ai/quizzes" className={navLinkClass}>
                  Quizzes
                </NavLink>
                <NavLink to="/ai/recommendations" className={navLinkClass}>
                  Recommendations
                </NavLink>
                <NavLink to="/analytics" className={navLinkClass}>
                  Analytics
                </NavLink>
                <NavLink to="/settings" className={navLinkClass}>
                  Settings
                </NavLink>
                <NavLink to="/profile" className={navLinkClass}>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 border border-slate-200">
                    {user?.username}
                  </span>
                </NavLink>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-slate-900">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>

      {isAuthenticated && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
}

export default MainLayout;
