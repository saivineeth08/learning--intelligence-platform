import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * SettingsPage — a hub for account-level settings.
 *
 * Profile editing and password change live on /profile to avoid duplication.
 * This page surfaces app-level information and quick links to related sections.
 */
export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Manage your account, preferences, and platform information.
        </p>
      </div>

      {/* Account */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Username</dt>
            <dd className="font-medium text-slate-900">{user?.username}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{user?.email || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Display name</dt>
            <dd className="font-medium text-slate-900">
              {[user?.first_name, user?.last_name].filter(Boolean).join(" ") || "—"}
            </dd>
          </div>
        </dl>
        <Link
          to="/profile"
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Edit profile &amp; change password
        </Link>
      </section>

      {/* AI Configuration */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">AI Configuration</h2>
        <p className="text-sm text-slate-600">
          The AI features (document chat, quiz generation, recommendations) use a configurable
          provider. The active provider is set by the <code className="bg-slate-100 px-1 rounded text-xs">AI_PROVIDER</code> environment variable on the server.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link
            to="/ai/chat"
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Document Chat
          </Link>
          <Link
            to="/ai/quizzes"
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Quiz Generator
          </Link>
          <Link
            to="/ai/recommendations"
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Recommendations
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">About</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Platform</dt>
            <dd className="font-medium text-slate-900">Learning Intelligence Platform</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Version</dt>
            <dd className="font-medium text-slate-900">1.0.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Backend</dt>
            <dd className="font-medium text-slate-900">Django + DRF</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Frontend</dt>
            <dd className="font-medium text-slate-900">React + Vite</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
