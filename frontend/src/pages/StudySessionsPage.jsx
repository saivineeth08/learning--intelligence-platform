import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGoals } from "../services/goals";
import {
  createStudySession,
  deleteStudySession,
  getStudySessions,
  updateStudySession,
} from "../services/studies";
import { getTasks } from "../services/tasks";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0 mins";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function toLocalISOString(date) {
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function StudySessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [goalFilter, setGoalFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [form, setForm] = useState({
    goal: "",
    task: "",
    started_at: "",
    ended_at: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setError("");
    try {
      const params = {};
      if (goalFilter) params.goal = goalFilter;
      if (taskFilter) params.task = taskFilter;

      const [sessionsData, goalsData, tasksData] = await Promise.all([
        getStudySessions(params),
        getGoals(),
        getTasks(),
      ]);
      setSessions(sessionsData);
      setGoals(goalsData);
      setTasks(tasksData);
    } catch (err) {
      setError("Failed to load study sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [goalFilter, taskFilter]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "goal") {
        const matchingTasks = tasks.filter((t) => String(t.goal) === value);
        if (!matchingTasks.some((t) => String(t.id) === prev.task)) {
          next.task = "";
        }
      }
      return next;
    });
  }

  function openCreate() {
    setEditingSession(null);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    setForm({
      goal: goals[0]?.id ? String(goals[0].id) : "",
      task: "",
      started_at: toLocalISOString(oneHourAgo),
      ended_at: toLocalISOString(now),
      notes: "",
    });
    setShowModal(true);
  }

  function openEdit(session) {
    setEditingSession(session);
    setForm({
      goal: session.goal ? String(session.goal) : "",
      task: session.task ? String(session.task) : "",
      started_at: session.started_at ? toLocalISOString(new Date(session.started_at)) : "",
      ended_at: session.ended_at ? toLocalISOString(new Date(session.ended_at)) : "",
      notes: session.notes || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (new Date(form.started_at) > new Date(form.ended_at)) {
      setError("Start time cannot be after end time.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        goal: form.goal ? parseInt(form.goal, 10) : null,
        task: form.task ? parseInt(form.task, 10) : null,
        started_at: new Date(form.started_at).toISOString(),
        ended_at: form.ended_at ? new Date(form.ended_at).toISOString() : null,
        notes: form.notes,
      };

      if (editingSession) {
        await updateStudySession(editingSession.id, payload);
      } else {
        await createStudySession(payload);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.ended_at?.[0] ||
        err.response?.data?.started_at?.[0] ||
        err.response?.data?.detail ||
        "Failed to save study session.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this study session?")) return;
    try {
      await deleteStudySession(id);
      await loadData();
    } catch (err) {
      setError("Failed to delete study session.");
    }
  }

  const filteredTasksForModal = form.goal
    ? tasks.filter((t) => String(t.goal) === form.goal)
    : tasks;

  const totalLoggedMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / 60
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Study Sessions
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Log and review your focused learning intervals across goals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            ⏱️ Total Logged: <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalLoggedMinutes}m</span>
          </div>
          <button
            onClick={openCreate}
            className="self-start inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <span>+</span>
            <span>Record Session</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Goal
          </label>
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-[180px] truncate"
          >
            <option value="">All Goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Task
          </label>
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-[180px] truncate"
          >
            <option value="">All Tasks</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-3 text-2xl">
            ⏱️
          </div>
          <p className="text-slate-900 dark:text-white font-semibold text-lg">No study sessions logged</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Record your study sessions to track learning momentum.</p>
          <button
            onClick={openCreate}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Record First Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 shadow-2xs transition-all gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold text-sm">
                  ⏱️
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {formatDuration(session.duration_seconds)}
                    </span>
                    {session.goal_title ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        🎯 {session.goal_title}
                      </span>
                    ) : null}
                    {session.task_title ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                        ✓ {session.task_title}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(session.started_at).toLocaleDateString()} • {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {session.ended_at ? new Date(session.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "In progress"}
                  </p>

                  {session.notes ? (
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 italic">
                      &ldquo;{session.notes}&rdquo;
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center shrink-0 text-xs font-semibold">
                <button
                  onClick={() => openEdit(session)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(session.id)}
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingSession ? "Edit Session" : "Log Study Session"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Goal
                  </label>
                  <select
                    name="goal"
                    value={form.goal}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">General (No Goal)</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Task
                  </label>
                  <select
                    name="task"
                    value={form.task}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">General</option>
                    {filteredTasksForModal.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="started_at"
                    value={form.started_at}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="ended_at"
                    value={form.ended_at}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Session Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Key concepts covered or observations"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editingSession ? "Update Session" : "Log Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default StudySessionsPage;
