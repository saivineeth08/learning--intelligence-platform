import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account preferences, theme, and AI configurations.
        </p>
      </div>

      {/* Theme & Display Preferences */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Appearance &amp; Theme</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Color Mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Switch between Light, Dark, or System automatic theme.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      {/* Account Info */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Account Details</h2>
          <Link
            to="/profile"
            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition-colors"
          >
            Edit Profile →
          </Link>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm pt-2">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3.5">
            <dt className="text-xs text-slate-500 dark:text-slate-400 font-medium">Username</dt>
            <dd className="mt-1 font-bold text-slate-900 dark:text-white">{user?.username}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3.5">
            <dt className="text-xs text-slate-500 dark:text-slate-400 font-medium">Email Address</dt>
            <dd className="mt-1 font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span>{user?.email || "—"}</span>
              {user?.is_email_verified && <span className="text-emerald-500 font-normal text-xs">✓</span>}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3.5">
            <dt className="text-xs text-slate-500 dark:text-slate-400 font-medium">Email Verification</dt>
            <dd className="mt-1 font-bold text-slate-900 dark:text-white">
              {user?.is_email_verified ? (
                <span className="text-emerald-600 dark:text-emerald-400">Verified</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">Pending Verification</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* AI & RAG Engine Info */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">AI &amp; RAG Intelligence Engine</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The platform uses a decoupled provider architecture for vector embeddings and LLM reasoning. Documents uploaded in <strong>Resources</strong> are chunked, embedded, and retrieved on-demand with strict user isolation.
        </p>

        <div className="flex gap-2 flex-wrap pt-2">
          <Link
            to="/ai/chat"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            ✨ Document Chat
          </Link>
          <Link
            to="/ai/quizzes"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            🧠 Quiz Generator
          </Link>
          <Link
            to="/ai/recommendations"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            💡 AI Recommendations
          </Link>
        </div>
      </section>

      {/* System Status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Architecture &amp; Security Specs</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <dt className="text-slate-400">Backend API</dt>
            <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">Django 5 + DRF</dd>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <dt className="text-slate-400">Auth Standard</dt>
            <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">JWT (Access/Refresh)</dd>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <dt className="text-slate-400">Frontend</dt>
            <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">React 19 + Vite 7</dd>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <dt className="text-slate-400">Database</dt>
            <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">PostgreSQL</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
