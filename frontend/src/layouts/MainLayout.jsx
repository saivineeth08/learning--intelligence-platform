import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function MainLayout() {
  const { isAuthenticated, user } = useAuth();

  const navLinkClass = ({ isActive }) =>
    isActive
      ? "font-semibold text-slate-900"
      : "text-slate-600 hover:text-slate-900";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Learning Intelligence Platform
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {isAuthenticated ? (
              <>
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
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
