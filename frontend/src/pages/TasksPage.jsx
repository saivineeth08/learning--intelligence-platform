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

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
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
      setError("Failed to save task. Please ensure all required fields are valid.");
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

  const statusColors = {
    TODO: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-600 border-red-200",
  };

  const priorityColors = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-slate-600">Actionable learning items across all your goals.</p>
        </div>
        <button
          onClick={openCreate}
          disabled={goals.length === 0}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          + New Task
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {goals.length === 0 && !loading ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You need to create at least one <Link to="/goals" className="font-semibold underline">Learning Goal</Link> before adding tasks.
        </div>
      ) : null}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Goal</label>
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
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
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
        <p className="text-slate-600">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-600 font-medium">No tasks found.</p>
          {goals.length > 0 ? (
            <button
              onClick={openCreate}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Add First Task
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-slate-200 bg-white p-4 gap-3 hover:border-slate-300 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.status === "COMPLETED"}
                  onChange={() => handleToggleStatus(task)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 cursor-pointer"
                />
                <div>
                  <p className={`font-semibold text-sm ${task.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {task.title}
                  </p>
                  {task.description ? (
                    <p className="text-xs text-slate-600 mt-0.5">{task.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                      🎯 {task.goal_title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[task.status] || "bg-slate-100"}`}>
                      {task.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[task.priority] || "bg-slate-100"}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-xs text-slate-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {task.due_date ? <span>Due: {task.due_date}</span> : <span>No due date</span>}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => openEdit(task)}
                    className="font-medium text-slate-700 hover:underline"
                  >
                    Edit
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">
              {editingTask ? "Edit Task" : "Create Task"}
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
                  <option value="" disabled>Select a goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Title *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. Implement Binary Search Tree"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm font-medium">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Task details and deliverables"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm font-medium">
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Priority
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Due Date
                  <input
                    type="date"
                    name="due_date"
                    value={form.due_date}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

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
                  {submitting ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default TasksPage;
