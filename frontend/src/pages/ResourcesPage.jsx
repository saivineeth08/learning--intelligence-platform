import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { indexResource } from "../services/ai";
import { getGoals } from "../services/goals";
import {
  createResource,
  deleteResource,
  downloadResource,
  getResources,
  updateResource,
  viewResource,
} from "../services/resources";
import { getTasks } from "../services/tasks";

function ResourcesPage() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [indexingState, setIndexingState] = useState({});
  const [viewingState, setViewingState] = useState({});
  const [downloadingState, setDownloadingState] = useState({});

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
    setSuccessMessage("");
    try {
      const res = await indexResource(resourceId);
      setSuccessMessage(`Resource indexed for AI (${res.total_chunks || 0} chunks extracted).`);
      await loadData();
    } catch (err) {
      setError("Failed to index resource for AI. Ensure file contains readable text.");
    } finally {
      setIndexingState((prev) => ({ ...prev, [resourceId]: false }));
    }
  }

  async function handleView(resourceId) {
    setViewingState((prev) => ({ ...prev, [resourceId]: true }));
    setError("");
    try {
      await viewResource(resourceId);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not open file for viewing."
      );
    } finally {
      setViewingState((prev) => ({ ...prev, [resourceId]: false }));
    }
  }

  async function handleDownload(resourceId, filename) {
    setDownloadingState((prev) => ({ ...prev, [resourceId]: true }));
    setError("");
    try {
      await downloadResource(resourceId, filename);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to download file."
      );
    } finally {
      setDownloadingState((prev) => ({ ...prev, [resourceId]: false }));
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Learning Resources
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Upload study documents (PDF, DOCX, TXT), notes, and reference links for AI knowledge retrieval.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="self-start inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors"
        >
          <span>+</span>
          <span>Add Resource</span>
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-3 items-center rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px] flex gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3.5 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 items-center">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Types</option>
            <option value="FILE">Files Only</option>
            <option value="LINK">Links Only</option>
          </select>

          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-[180px] truncate"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-3 text-2xl">
            📚
          </div>
          <p className="text-slate-900 dark:text-white font-semibold text-lg">No learning resources yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Upload course PDFs, lecture notes, or docs to start chatting with your materials using AI.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Add First Resource
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 shadow-2xs transition-all space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xl">
                      {resource.resource_type === "FILE" ? "📄" : "🔗"}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                        {resource.title}
                      </h3>
                      {resource.file_name && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[220px]">
                          {resource.file_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                        resource.resource_type === "FILE"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                          : "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800"
                      }`}
                    >
                      {resource.resource_type}
                    </span>

                    {resource.is_indexed ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                        ✨ AI Ready ({resource.chunk_count})
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleIndexResource(resource.id)}
                        disabled={indexingState[resource.id]}
                        className="text-[10px] px-2.5 py-0.5 rounded-md font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800 cursor-pointer disabled:opacity-50"
                      >
                        {indexingState[resource.id] ? "⚙️ Indexing..." : "⚡ Index AI"}
                      </button>
                    )}
                  </div>
                </div>

                {resource.description ? (
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {resource.description}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-3 items-center text-xs">
                  {resource.goal_title ? (
                    <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      🎯 {resource.goal_title}
                    </span>
                  ) : null}
                  {resource.task_title ? (
                    <span className="bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-md font-medium">
                      ✓ {resource.task_title}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {resource.resource_type === "FILE" ? (
                    <>
                      {/* Explicit Inline View */}
                      <button
                        type="button"
                        onClick={() => handleView(resource.id)}
                        disabled={viewingState[resource.id]}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                      >
                        <span>👁️</span>
                        <span>{viewingState[resource.id] ? "Opening..." : "View"}</span>
                      </button>

                      {/* Explicit Download */}
                      <button
                        type="button"
                        onClick={() => handleDownload(resource.id, resource.file_name)}
                        disabled={downloadingState[resource.id]}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                      >
                        <span>⬇️</span>
                        <span>{downloadingState[resource.id] ? "Downloading..." : "Download"}</span>
                      </button>
                    </>
                  ) : null}

                  {resource.resource_type === "LINK" && resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300 transition-colors"
                    >
                      <span>🔗</span>
                      <span>Open Link ↗</span>
                    </a>
                  ) : null}

                  <Link
                    to={`/ai/chat?resource=${resource.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300 transition-colors"
                  >
                    <span>💬</span>
                    <span>Chat AI</span>
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(resource)}
                    className="p-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded-md"
                    title="Edit Resource"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(resource.id)}
                    className="p-1.5 text-xs font-medium text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 rounded-md"
                    title="Delete Resource"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resource Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingResource ? "Edit Resource" : "Add Learning Resource"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Distributed Systems Chapter 4"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, resource_type: "FILE" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                      form.resource_type === "FILE"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    📄 Upload File (PDF/DOCX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, resource_type: "LINK" }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                      form.resource_type === "LINK"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    🔗 External URL Link
                  </button>
                </div>
              </div>

              {form.resource_type === "FILE" ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    File Upload
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                    required={!editingResource}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Supported: PDF, DOCX, TXT, MD, PNG, JPG (max 25MB)</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    URL Link
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={form.url}
                    onChange={handleFormChange}
                    placeholder="https://example.com/article"
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Optional summary or notes regarding this resource"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Link to Goal
                  </label>
                  <select
                    name="goal"
                    value={form.goal}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None (Independent)</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Link to Task
                  </label>
                  <select
                    name="task"
                    value={form.task}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None</option>
                    {filteredTasksForModal.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                  {submitting ? "Saving..." : editingResource ? "Update Resource" : "Create Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ResourcesPage;
