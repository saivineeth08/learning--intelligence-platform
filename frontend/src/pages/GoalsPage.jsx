import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createGoal, deleteGoal, getGoals, updateGoal } from "../services/goals";

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    status: "ACTIVE",
    priority: "MEDIUM",
    target_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadGoals() {
    setError("");
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await getGoals(params);
      setGoals(data);
    } catch (err) {
      setError("Failed to load goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, [statusFilter, priorityFilter]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openCreate() {
    setEditingGoal(null);
    setForm({
      title: "",
      description: "",
      category: "",
      status: "ACTIVE",
      priority: "MEDIUM",
      target_date: "",
    });
    setShowCreateModal(true);
  }

  function openEdit(goal) {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      description: goal.description || "",
      category: goal.category || "",
      status: goal.status,
      priority: goal.priority,
      target_date: goal.target_date || "",
    });
    setShowCreateModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...form,
        target_date: form.target_date || null,
      };
      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
      } else {
        await createGoal(payload);
      }
      setShowCreateModal(false);
      await loadGoals();
    } catch (err) {
      setError("Failed to save goal. Please check the form fields.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this goal? Related tasks and study sessions will also be removed.")) {
      return;
    }
    try {
      await deleteGoal(id);
      await loadGoals();
    } catch (err) {
      setError("Failed to delete goal.");
    }
  }

  const priorityColors = {
    LOW: "bg-slate-100 text-slate-700",
    MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const statusColors = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-purple-50 text-purple-700 border-purple-200",
    ARCHIVED: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Goals</h1>
          <p className="mt-1 text-slate-600">Track and manage your primary learning objectives.</p>
        </div>
        <button
          onClick={openCreate}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New Goal
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
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

      {/* Goals List */}
      {loading ? (
        <p className="text-slate-600">Loading goals...</p>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-600 font-medium">No learning goals found.</p>
          <p className="text-slate-500 text-sm mt-1">Get started by creating your first goal.</p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Create Goal
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/goals/${goal.id}`}
                    className="text-lg font-semibold hover:text-blue-600 hover:underline"
                  >
                    {goal.title}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[goal.status] || "bg-slate-100"}`}>
                      {goal.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[goal.priority] || "bg-slate-100"}`}>
                      {goal.priority}
                    </span>
                  </div>
                </div>
                {goal.category ? (
                  <span className="inline-block mt-1 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                    {goal.category}
                  </span>
                ) : null}
                {goal.description ? (
                  <p className="mt-2.5 text-sm text-slate-600 line-clamp-2">
                    {goal.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {goal.target_date ? `Target: ${goal.target_date}` : "No deadline"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(goal)}
                    className="text-slate-700 font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-red-600 font-medium hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">
              {editingGoal ? "Edit Goal" : "Create Learning Goal"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Title *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. Master Data Structures"
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
                  placeholder="What is your plan or scope?"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Category
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    placeholder="e.g. Computer Science"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Target Date
                  <input
                    name="target_date"
                    type="date"
                    value={form.target_date}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
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
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default GoalsPage;
