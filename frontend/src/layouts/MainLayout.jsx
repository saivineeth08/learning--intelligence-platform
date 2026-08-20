import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function MainLayout() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Learning Intelligence Platform
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <Link className="font-medium" to="/profile">
                {user.username}
              </Link>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link
                  to="/register"
                  className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
