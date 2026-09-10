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
      setError("Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.first_name || user?.username}!
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track your study velocity, progress towards active goals, and AI resources.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
            <span className="text-base">🔥</span>
            <span>{summary?.current_streak || 0} Day Streak</span>
          </div>
          <Link
            to="/study-sessions"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <span>+</span>
            <span>Record Study</span>
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Today's Study Time
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {formatDuration(summary?.today_study_seconds)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly: {formatDuration(summary?.weekly_study_seconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Study Time
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {formatDuration(summary?.total_study_seconds)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monthly: {formatDuration(summary?.monthly_study_seconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Goals
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {summary?.active_goals_count || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {summary?.completed_goals_count || 0} completed of {summary?.total_goals_count || 0} total
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pending Tasks
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {summary?.pending_tasks_count || 0}
            </p>
            {summary?.overdue_tasks_count > 0 ? (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
                {summary.overdue_tasks_count} overdue
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {summary?.completed_tasks_count || 0} completed tasks
          </p>
        </div>
      </div>

      {/* AI Learning Intelligence Banner */}
      <div className="rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-indigo-300">
              ✨ Grounded AI Intelligence
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Chat with your Study Materials &amp; Generate Quizzes
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload study guides and lecture notes. Extract vector chunks and ask grounded questions with exact source citations or generate interactive multiple-choice assessments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              to="/ai/chat"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-xs"
            >
              💬 Ask Documents
            </Link>
            <Link
              to="/ai/quizzes"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors"
            >
              🧠 Generate Quiz
            </Link>
            <Link
              to="/ai/recommendations"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors"
            >
              💡 Recommendations
            </Link>
          </div>
        </div>
      </div>

      {/* Goals Progress Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Goal Progress</h2>
          <Link to="/goals" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            View All Goals →
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            No active goals yet. Create a study goal to track milestones and velocity.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.slice(0, 4).map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
              >
                <div className="flex justify-between items-start text-xs sm:text-sm">
                  <Link
                    to={`/goals/${g.id}`}
                    className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate max-w-[200px]"
                  >
                    {g.title}
                  </Link>
                  <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs shrink-0">
                    {g.completion_percentage}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${g.completion_percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{g.completed_tasks}/{g.total_tasks} Tasks Done</span>
                  <span>⏱️ {formatDuration(g.total_study_seconds)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Grid (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Study Sessions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">⏱️ Recent Sessions</h3>
              <Link to="/study-sessions" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </div>
            {summary?.recent_study_sessions?.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No study sessions logged yet.</p>
            ) : (
              <div className="space-y-2">
                {summary?.recent_study_sessions?.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-slate-900 dark:text-slate-200 truncate max-w-[150px]">{s.goal_title || "General Study"}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(s.duration_seconds)}</span>
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">
                      {new Date(s.started_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Notes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">📝 Recent Notes</h3>
              <Link to="/notes" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </div>
            {summary?.recent_notes?.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No notes written yet.</p>
            ) : (
              <div className="space-y-2">
                {summary?.recent_notes?.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{n.title}</p>
                    {n.content ? (
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-1">{n.content}</p>
                    ) : null}
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Resources */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">📚 Recent Resources</h3>
              <Link to="/resources" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </div>
            {summary?.recent_resources?.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No resources added yet.</p>
            ) : (
              <div className="space-y-2">
                {summary?.recent_resources?.map((r) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{r.title}</p>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        {r.resource_type}
                      </span>
                    </div>
                    {r.goal_title ? (
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">🎯 {r.goal_title}</p>
                    ) : null}
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
