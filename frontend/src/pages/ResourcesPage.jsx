import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { indexResource } from "../services/ai";
import { getGoals } from "../services/goals";
import {
  createResource,
  deleteResource,
  getResources,
  updateResource,
} from "../services/resources";
import { getTasks } from "../services/tasks";

function ResourcesPage() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [indexingState, setIndexingState] = useState({});

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [goalFilter, setGoalFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    resource_type: "FILE",
    url: "",
    goal: "",
    task: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleIndexResource(resourceId) {
    setIndexingState((prev) => ({ ...prev, [resourceId]: true }));
    setError("");
    try {
      await indexResource(resourceId);
      await loadData();
    } catch (err) {
      setError("Failed to index resource for AI. Check that it contains readable text.");
    } finally {
      setIndexingState((prev) => ({ ...prev, [resourceId]: false }));
    }
  }

  async function loadData() {
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.type = typeFilter;
      if (goalFilter) params.goal = goalFilter;

      const [resData, goalData, taskData] = await Promise.all([
        getResources(params),
        getGoals(),
        getTasks(),
      ]);
      setResources(resData);
      setGoals(goalData);
      setTasks(taskData);
    } catch (err) {
      setError("Failed to load learning resources.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [typeFilter, goalFilter]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadData();
  }

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
    setEditingResource(null);
    setSelectedFile(null);
    setForm({
      title: "",
      description: "",
      resource_type: "FILE",
      url: "",
      goal: "",
      task: "",
    });
    setShowModal(true);
  }

  function openEdit(resource) {
    setEditingResource(resource);
    setSelectedFile(null);
    setForm({
      title: resource.title,
      description: resource.description || "",
      resource_type: resource.resource_type,
      url: resource.url || "",
      goal: resource.goal ? String(resource.goal) : "",
      task: resource.task ? String(resource.task) : "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("resource_type", form.resource_type);

      if (form.resource_type === "FILE") {
        if (selectedFile) {
          formData.append("file", selectedFile);
        }
      } else {
        formData.append("url", form.url);
      }

      if (form.goal) {
        formData.append("goal", form.goal);
      }
      if (form.task) {
        formData.append("task", form.task);
      }

      if (editingResource) {
        await updateResource(editingResource.id, formData);
      } else {
        await createResource(formData);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.file?.[0] ||
        err.response?.data?.url?.[0] ||
        err.response?.data?.title?.[0] ||
        err.response?.data?.detail ||
        "Failed to save resource. Please check the inputs.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    try {
      await deleteResource(id);
      await loadData();
    } catch (err) {
      setError("Failed to delete resource.");
    }
  }

  const filteredTasksForModal = form.goal
    ? tasks.filter((t) => String(t.goal) === form.goal)
    : tasks;

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Resources</h1>
          <p className="mt-1 text-slate-600">
            Upload course materials, documentation files, and helpful external links.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Resource
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="search"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 items-center">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Types</option>
            <option value="FILE">Files</option>
            <option value="LINK">Links</option>
          </select>

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
      </div>

      {/* Resource Grid / List */}
      {loading ? (
        <p className="text-slate-600">Loading resources...</p>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-600 font-medium">No learning resources found.</p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add Your First Resource
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 shadow-xs space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {resource.resource_type === "FILE" ? "📄" : "🔗"}
                    </span>
                    <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        resource.resource_type === "FILE"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-cyan-50 text-cyan-700 border-cyan-200"
                      }`}
                    >
                      {resource.resource_type}
                    </span>
                    {resource.is_indexed ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✨ AI Ready ({resource.chunk_count})
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleIndexResource(resource.id)}
                        disabled={indexingState[resource.id]}
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer disabled:opacity-50"
                      >
                        {indexingState[resource.id] ? "⚙️ Indexing..." : "⚡ Index"}
                      </button>
                    )}
                  </div>
                </div>

                {resource.description ? (
                  <p className="mt-2 text-sm text-slate-600">{resource.description}</p>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-3 items-center text-xs">
                  {resource.goal_title ? (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      🎯 {resource.goal_title}
                    </span>
                  ) : null}
                  {resource.task_title ? (
                    <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                      ✓ {resource.task_title}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {resource.resource_type === "FILE" && resource.file_url ? (
                    <a
                      href={resource.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      <span>Download / View</span>
                      <span className="text-slate-400 font-normal">({resource.file_name})</span>
                    </a>
                  ) : null}
                  {resource.resource_type === "LINK" && resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:underline truncate max-w-[200px]"
                    >
                      <span>Open Link ↗</span>
                      <span className="text-slate-400 font-normal truncate">({resource.url})</span>
                    </a>
                  ) : null}
                </div>
              </div>

              {/* AI Actions Row */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/ai/chat?resource=${resource.id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    💬 Ask AI
                  </Link>
                  <Link
                    to={`/ai/quizzes?resource=${resource.id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    ✨ Quiz
                  </Link>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button
                    onClick={() => openEdit(resource)}
                    className="font-medium text-slate-700 hover:underline"
                  >
                    Edit
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleDelete(resource.id)}
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">
              {editingResource ? "Edit Resource" : "Add Learning Resource"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Resource Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="resource_type"
                      value="FILE"
                      checked={form.resource_type === "FILE"}
                      onChange={handleFormChange}
                    />
                    <span>📄 Upload File</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="resource_type"
                      value="LINK"
                      checked={form.resource_type === "LINK"}
                      onChange={handleFormChange}
                    />
                    <span>🔗 External Link</span>
                  </label>
                </div>
              </div>

              <label className="block text-sm font-medium">
                Title *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. Django ORM Cheat Sheet"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm font-medium">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Summary or purpose of this material"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              {form.resource_type === "FILE" ? (
                <label className="block text-sm font-medium">
                  File {editingResource ? "(Leave blank to keep existing)" : "*"}
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx,.doc,.png,.jpg,.jpeg,.md"
                    required={!editingResource}
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="mt-1 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Allowed: PDF, TXT, DOCX, DOC, PNG, JPG, MD (Max 10MB)
                  </p>
                </label>
              ) : (
                <label className="block text-sm font-medium">
                  URL *
                  <input
                    type="url"
                    name="url"
                    value={form.url}
                    onChange={handleFormChange}
                    required
                    placeholder="https://..."
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Goal (Optional)
                  <select
                    name="goal"
                    value={form.goal}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">No goal attached</option>
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
                    <option value="">No task attached</option>
                    {filteredTasksForModal.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
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
                  {submitting ? "Saving..." : editingResource ? "Update Resource" : "Save Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ResourcesPage;
