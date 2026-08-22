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
      // If goal changes, clear task if task does not belong to new goal
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
      goal: String(session.goal),
      task: session.task ? String(session.task) : "",
      started_at: toLocalISOString(new Date(session.started_at)),
      ended_at: toLocalISOString(new Date(session.ended_at)),
      notes: session.notes || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const startedDate = new Date(form.started_at);
    const endedDate = new Date(form.ended_at);

    if (endedDate < startedDate) {
      setError("End time cannot be earlier than start time.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        goal: parseInt(form.goal, 10),
        task: form.task ? parseInt(form.task, 10) : null,
        started_at: startedDate.toISOString(),
        ended_at: endedDate.toISOString(),
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
      setError(
        err.response?.data?.ended_at ||
          err.response?.data?.task ||
          "Failed to save study session. Please verify the time range."
      );
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
      setError("Failed to delete session.");
    }
  }

  const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const filteredTasksForModal = form.goal
    ? tasks.filter((t) => String(t.goal) === form.goal)
    : tasks;

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Sessions</h1>
          <p className="mt-1 text-slate-600">Log and review your focused learning time.</p>
        </div>
        <button
          onClick={openCreate}
          disabled={goals.length === 0}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          + Record Session
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {goals.length === 0 && !loading ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You need at least one <Link to="/goals" className="font-semibold underline">Learning Goal</Link> before recording study sessions.
        </div>
      ) : null}

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Logged Time</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatDuration(totalSeconds)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Sessions</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{sessions.length}</p>
        </div>
        <div className="hidden sm:block rounded-lg border border-slate-200 bg-white p-4 text-center shadow-xs">
          <p className="text-xs font-medium text-slate-500">Average Session</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {sessions.length > 0 ? formatDuration(Math.round(totalSeconds / sessions.length)) : "0 mins"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Filter by Goal</label>
          <select
            value={goalFilter}
            onChange={(e) => {
              setGoalFilter(e.target.value);
              setTaskFilter("");
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
        {goalFilter ? (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Filter by Task</label>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">All Tasks for Goal</option>
              {tasks
                .filter((t) => String(t.goal) === goalFilter)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Sessions List */}
      {loading ? (
        <p className="text-slate-600">Loading study sessions...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-600 font-medium">No study sessions recorded yet.</p>
          {goals.length > 0 ? (
            <button
              onClick={openCreate}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Record First Session
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-slate-200 bg-white p-4 gap-3 hover:border-slate-300 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    ⏱️ {formatDuration(session.duration_seconds)}
                  </span>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    🎯 {session.goal_title}
                  </span>
                  {session.task_title ? (
                    <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      ✓ {session.task_title}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(session.started_at).toLocaleString()} &mdash; {new Date(session.ended_at).toLocaleTimeString()}
                </p>
                {session.notes ? (
                  <p className="text-sm text-slate-700 italic pt-1">{session.notes}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 self-end sm:self-center">
                <button
                  onClick={() => openEdit(session)}
                  className="text-slate-700 hover:underline"
                >
                  Edit
                </button>
                <span>•</span>
                <button
                  onClick={() => handleDelete(session.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">
              {editingSession ? "Edit Study Session" : "Record Study Session"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Goal *
                <select
                  name="goal"
                  value={form.goal}
                  onChange={handleFormChange}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select Goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Task (Optional)
                <select
                  name="task"
                  value={form.task}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">No specific task</option>
                  {filteredTasksForModal.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Started At *
                  <input
                    type="datetime-local"
                    name="started_at"
                    value={form.started_at}
                    onChange={handleFormChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Ended At *
                  <input
                    type="datetime-local"
                    name="ended_at"
                    value={form.ended_at}
                    onChange={handleFormChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Notes & Reflections
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Key concepts learned, questions, breakthroughs"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editingSession ? "Update Session" : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default StudySessionsPage;
