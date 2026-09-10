import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGoals } from "../services/goals";
import { createTask, deleteTask, getTasks, updateTask } from "../services/tasks";

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [goalFilter, setGoalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({
    goal: "",
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    due_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setError("");
    try {
      const params = {};
      if (goalFilter) params.goal = goalFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [taskData, goalData] = await Promise.all([
        getTasks(params),
        getGoals(),
      ]);
      setTasks(taskData);
      setGoals(goalData);
    } catch (err) {
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [goalFilter, statusFilter, priorityFilter]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openCreate() {
    setEditingTask(null);
    setForm({
      goal: goals[0]?.id ? String(goals[0].id) : "",
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      due_date: "",
    });
    setShowModal(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setForm({
      goal: String(task.goal),
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || "",
    });
    setShowModal(true);
  }

  async function handleToggleStatus(task) {
    const nextStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    try {
      await updateTask(task.id, { status: nextStatus });
      await loadData();
    } catch (err) {
      setError("Failed to update status.");
    }
  }

  const [modalError, setModalError] = useState("");
  const selectedGoal = goals.find((g) => String(g.id) === String(form.goal));

  async function handleSubmit(e) {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);
    setError("");

    if (form.due_date && selectedGoal?.target_date && form.due_date > selectedGoal.target_date) {
      setModalError(`Task due date (${form.due_date}) cannot be after the goal target date (${selectedGoal.target_date}).`);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...form,
        goal: parseInt(form.goal, 10),
        due_date: form.due_date || null,
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
      } else {
        await createTask(payload);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.due_date?.[0] ||
        err.response?.data?.goal?.[0] ||
        err.response?.data?.detail ||
        "Failed to save task. Please check the submitted fields.";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      await loadData();
    } catch (err) {
      setError("Failed to delete task.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Action Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Break down goals into actionable, prioritized study steps.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={goals.length === 0}
          className="self-start inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          <span>+</span>
          <span>Add Task</span>
        </button>
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
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Priority
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-3 text-2xl">
            ✓
          </div>
          <p className="text-slate-900 dark:text-white font-semibold text-lg">No tasks found</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {goals.length === 0
              ? "Create a goal first before adding tasks."
              : "Add your first study task to get momentum."}
          </p>
          {goals.length > 0 ? (
            <button
              onClick={openCreate}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
            >
              Add First Task
            </button>
          ) : (
            <Link
              to="/goals"
              className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
            >
              Create a Goal
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 shadow-2xs transition-all"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-4">
                <input
                  type="checkbox"
                  checked={task.status === "COMPLETED"}
                  onChange={() => handleToggleStatus(task)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-sm font-bold ${
                        task.status === "COMPLETED"
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {task.title}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      🎯 {task.goal_title}
                    </span>
                  </div>

                  {task.description ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {task.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs">
                {task.due_date ? (
                  <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
                    📅 {task.due_date}
                  </span>
                ) : null}

                <span
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                    task.priority === "HIGH"
                      ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                  }`}
                >
                  {task.priority}
                </span>

                <button
                  onClick={() => openEdit(task)}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-red-600 dark:text-red-400 font-semibold hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingTask ? "Edit Task" : "Create Study Task"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {modalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  ⚠️ {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Goal *
                </label>
                <select
                  name="goal"
                  value={form.goal}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select a Goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} {g.target_date ? `(Deadline: ${g.target_date})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Solve 5 Dynamic Programming Problems"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Optional details or instructions"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={form.due_date}
                    max={selectedGoal?.target_date || undefined}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {selectedGoal?.target_date && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Max: {selectedGoal.target_date} (Goal deadline)
                    </p>
                  )}
                </div>
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
                  {submitting ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default TasksPage;
