import { useEffect, useState } from "react";
import { getGoals } from "../services/goals";
import {
  createNote,
  deleteNote,
  getNotes,
  updateNote,
} from "../services/notes";
import { getResources } from "../services/resources";
import { getTasks } from "../services/tasks";

function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    goal: "",
    task: "",
    resource: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (goalFilter) params.goal = goalFilter;
      if (taskFilter) params.task = taskFilter;
      if (resourceFilter) params.resource = resourceFilter;

      const [notesData, goalsData, tasksData, resourcesData] = await Promise.all([
        getNotes(params),
        getGoals(),
        getTasks(),
        getResources(),
      ]);
      setNotes(notesData);
      setGoals(goalsData);
      setTasks(tasksData);
      setResources(resourcesData);
    } catch (err) {
      setError("Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [goalFilter, taskFilter, resourceFilter]);

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
    setEditingNote(null);
    setForm({
      title: "",
      content: "",
      goal: "",
      task: "",
      resource: "",
    });
    setShowModal(true);
  }

  function openEdit(note) {
    setEditingNote(note);
    setForm({
      title: note.title,
      content: note.content || "",
      goal: note.goal ? String(note.goal) : "",
      task: note.task ? String(note.task) : "",
      resource: note.resource ? String(note.resource) : "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        content: form.content,
        goal: form.goal ? parseInt(form.goal, 10) : null,
        task: form.task ? parseInt(form.task, 10) : null,
        resource: form.resource ? parseInt(form.resource, 10) : null,
      };

      if (editingNote) {
        await updateNote(editingNote.id, payload);
      } else {
        await createNote(payload);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.title?.[0] ||
        err.response?.data?.detail ||
        "Failed to save note.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteNote(id);
      await loadData();
    } catch (err) {
      setError("Failed to delete note.");
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
            Study Notes
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Synthesize key takeaways, cheat sheets, and lecture summaries.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="self-start inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
        >
          <span>+</span>
          <span>New Note</span>
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-3 items-center rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="search"
            placeholder="Search notes content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-[150px] truncate"
          >
            <option value="">All Goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>

          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-[150px] truncate"
          >
            <option value="">All Resources</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-3 text-2xl">
            📝
          </div>
          <p className="text-slate-900 dark:text-white font-semibold text-lg">No notes created yet</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Capture your knowledge and review it alongside goals.</p>
          <button
            onClick={openCreate}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Create First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 shadow-2xs transition-all space-y-3"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {note.title}
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                  {note.content || "Empty note content."}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3 items-center text-[10px]">
                  {note.goal_title ? (
                    <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      🎯 {note.goal_title}
                    </span>
                  ) : null}
                  {note.resource_title ? (
                    <span className="bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 px-2 py-0.5 rounded-md font-medium">
                      📄 {note.resource_title}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2 font-semibold">
                  <button
                    onClick={() => openEdit(note)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingNote ? "Edit Note" : "Create Note"}
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
                  Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. MapReduce Core Concepts"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Content
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleFormChange}
                  rows={5}
                  placeholder="Write your study notes and key takeaways here..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Goal
                  </label>
                  <select
                    name="goal"
                    value={form.goal}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None</option>
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None</option>
                    {filteredTasksForModal.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Resource
                  </label>
                  <select
                    name="resource"
                    value={form.resource}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
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
                  {submitting ? "Saving..." : editingNote ? "Update Note" : "Create Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default NotesPage;
