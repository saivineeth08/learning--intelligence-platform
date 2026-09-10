import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getGoalAnalytics,
  getStudyTimeAnalytics,
  getTaskAnalytics,
} from "../services/analytics";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatHours(seconds) {
  return (seconds / 3600).toFixed(1);
}

function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [studyData, setStudyData] = useState(null);
  const [goalData, setGoalData] = useState([]);
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData(selectedDays = days) {
    setError("");
    try {
      const [studyRes, goalRes, taskRes] = await Promise.all([
        getStudyTimeAnalytics(selectedDays),
        getGoalAnalytics(),
        getTaskAnalytics(),
      ]);
      setStudyData(studyRes);
      setGoalData(goalRes);
      setTaskData(taskRes);
    } catch (err) {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(days);
  }, [days]);

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading learning analytics...</p>;
  }

  const maxDuration = Math.max(
    ...(studyData?.daily_breakdown?.map((d) => d.duration_seconds) || [1]),
    1
  );

  return (
    <section className="space-y-8">
      {/* Header & Window Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Learning Analytics</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Deep insights into your study habits, goal completion rates, and task velocity.
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-xs">
          {[7, 14, 30].map((num) => (
            <button
              key={num}
              onClick={() => setDays(num)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                days === num
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Last {num} Days
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 shadow-xs">
          {error}
        </p>
      ) : null}

      {/* Study Time Chart Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Study Time Distribution</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total of {formatDuration(studyData?.total_seconds)} logged over the last {days} days
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Daily Average</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {formatDuration(Math.round((studyData?.total_seconds || 0) / days))} / day
            </p>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-6 pb-2">
          <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 px-2 border-b border-slate-200 dark:border-slate-800">
            {studyData?.daily_breakdown?.map((item) => {
              const heightPercent = Math.round((item.duration_seconds / maxDuration) * 100);
              const dateObj = new Date(item.date);
              const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <span className="rounded-md bg-slate-900 dark:bg-slate-800 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white whitespace-nowrap shadow-md">
                      {formatDuration(item.duration_seconds)} ({item.date})
                    </span>
                  </div>

                  {/* Vertical Bar */}
                  <div
                    className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 ${
                      item.duration_seconds > 0
                        ? "bg-blue-600 dark:bg-blue-500 group-hover:bg-blue-700 dark:group-hover:bg-blue-400 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800/80"
                    }`}
                    style={{
                      height: `${item.duration_seconds > 0 ? Math.max(heightPercent, 8) : 4}%`,
                    }}
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 truncate max-w-full">
                    {days <= 14 ? label : label.split("/")[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Goal Performance Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Goal Investment & Progress</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track task completion rates and time spent per objective</p>
          </div>
          <Link to="/goals" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Manage Goals &rarr;
          </Link>
        </div>

        {goalData.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4">No learning goals created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Goal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tasks</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Time Invested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {goalData.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <Link to={`/goals/${g.id}`} className="hover:underline">
                        {g.title}
                      </Link>
                      {g.category ? (
                        <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">({g.category})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {g.completed_tasks} / {g.total_tasks}
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{ width: `${g.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {g.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {formatDuration(g.total_study_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Velocity & Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Task Status Overview</h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {taskData?.completion_rate || 0}% Completion Rate
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(taskData?.status_distribution || {}).map(([key, count]) => {
              const pct = taskData?.total_tasks > 0 ? Math.round((count / taskData.total_tasks) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300">{key}</span>
                    <span className="text-slate-500 dark:text-slate-400">{count} tasks ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        key === "COMPLETED"
                          ? "bg-emerald-500"
                          : key === "IN_PROGRESS"
                          ? "bg-blue-500"
                          : key === "TODO"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Task Priorities</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{taskData?.total_tasks || 0} Total Tasks</span>
          </div>

          <div className="space-y-3">
            {Object.entries(taskData?.priority_distribution || {}).map(([key, count]) => {
              const pct = taskData?.total_tasks > 0 ? Math.round((count / taskData.total_tasks) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300">{key}</span>
                    <span className="text-slate-500 dark:text-slate-400">{count} tasks ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        key === "HIGH"
                          ? "bg-rose-500"
                          : key === "MEDIUM"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnalyticsPage;
