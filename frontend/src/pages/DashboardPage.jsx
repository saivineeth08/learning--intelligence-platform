import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary, getGoalAnalytics } from "../services/analytics";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0 mins";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");
    try {
      const [sumData, goalData] = await Promise.all([
        getDashboardSummary(),
        getGoalAnalytics(),
      ]);
      setSummary(sumData);
      setGoals(goalData);
    } catch (err) {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <p className="text-slate-600">Loading your learning dashboard...</p>;
  }

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.first_name || user?.username}!
          </h1>
          <p className="mt-1 text-slate-600">
            Here is a snapshot of your learning progress and focus areas today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-sm font-semibold text-amber-900 shadow-xs">
            <span className="text-lg">🔥</span>
            <span>{summary?.current_streak || 0} Day Streak</span>
          </div>
          <Link
            to="/study-sessions"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Record Session
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Today's Study Time
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {formatDuration(summary?.today_study_seconds)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Weekly: {formatDuration(summary?.weekly_study_seconds)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Study Time
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {formatDuration(summary?.total_study_seconds)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Monthly: {formatDuration(summary?.monthly_study_seconds)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Goals
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {summary?.active_goals_count || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.completed_goals_count || 0} completed of {summary?.total_goals_count || 0} total
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Tasks
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-slate-900">
              {summary?.pending_tasks_count || 0}
            </p>
            {summary?.overdue_tasks_count > 0 ? (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                {summary.overdue_tasks_count} overdue
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.completed_tasks_count || 0} completed tasks
          </p>
        </div>
      </div>

      {/* Goals Progress Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Goal Progress</h2>
          <Link to="/goals" className="text-xs font-semibold text-blue-600 hover:underline">
            View All Goals &rarr;
          </Link>
        </div>

        {goals.length === 0 ? (
          <p className="text-sm text-slate-500">No active goals yet. Create one to track your learning journey.</p>
        ) : (
          <div className="space-y-4">
            {goals.slice(0, 4).map((g) => (
              <div key={g.id} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <Link to={`/goals/${g.id}`} className="font-semibold text-slate-900 hover:underline">
                    {g.title}
                  </Link>
                  <span className="text-xs font-medium text-slate-600">
                    {g.completed_tasks} / {g.total_tasks} tasks ({g.completion_percentage}%) &bull; {formatDuration(g.total_study_seconds)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all duration-300"
                    style={{ width: `${g.completion_percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Grid (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Study Sessions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">⏱️ Recent Sessions</h3>
              <Link to="/study-sessions" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            {summary?.recent_study_sessions?.length === 0 ? (
              <p className="text-xs text-slate-500">No study sessions logged yet.</p>
            ) : (
              <div className="space-y-2.5">
                {summary?.recent_study_sessions?.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-slate-900 truncate">{s.goal_title || "Learning"}</span>
                      <span className="font-bold text-blue-800">{formatDuration(s.duration_seconds)}</span>
                    </div>
                    <p className="text-slate-500 mt-1">
                      {new Date(s.started_at).toLocaleDateString()} &bull; {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">📝 Recent Notes</h3>
              <Link to="/notes" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            {summary?.recent_notes?.length === 0 ? (
              <p className="text-xs text-slate-500">No notes written yet.</p>
            ) : (
              <div className="space-y-2.5">
                {summary?.recent_notes?.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                    {n.content ? (
                      <p className="text-slate-600 mt-0.5 line-clamp-2">{n.content}</p>
                    ) : null}
                    <p className="text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Resources */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">📚 Recent Resources</h3>
              <Link to="/resources" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            {summary?.recent_resources?.length === 0 ? (
              <p className="text-xs text-slate-500">No resources added yet.</p>
            ) : (
              <div className="space-y-2.5">
                {summary?.recent_resources?.map((r) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-slate-900 truncate">{r.title}</p>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {r.resource_type}
                      </span>
                    </div>
                    {r.goal_title ? (
                      <p className="text-slate-500 mt-0.5">🎯 {r.goal_title}</p>
                    ) : null}
                    <p className="text-slate-400 mt-1">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
