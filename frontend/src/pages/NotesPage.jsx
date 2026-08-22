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
        err.response?.data?.task ||
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
          <h1 className="text-3xl font-bold tracking-tight">Learning Notes</h1>
          <p className="mt-1 text-slate-600">
            Capture concepts, key takeaways, and thoughts linked to your goals and resources.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New Note
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
            placeholder="Search notes by title or content..."
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

        <div className="flex flex-wrap gap-2 items-center">
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

          {goalFilter ? (
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">All Tasks</option>
              {tasks
                .filter((t) => String(t.goal) === goalFilter)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          ) : null}

          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
        <p className="text-slate-600">Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-600 font-medium">No notes found.</p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Create Your First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 shadow-xs"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900">{note.title}</h3>
                {note.content ? (
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {note.content}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-4 items-center text-xs">
                  {note.goal_title ? (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      🎯 {note.goal_title}
                    </span>
                  ) : null}
                  {note.task_title ? (
                    <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                      ✓ {note.task_title}
                    </span>
                  ) : null}
                  {note.resource_title ? (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                      📄 {note.resource_title}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(note)}
                    className="font-medium text-slate-700 hover:underline"
                  >
                    Edit
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleDelete(note.id)}
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

      {/* Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">
              {editingNote ? "Edit Note" : "Create Note"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Title *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. Graph Traversal Algorithms"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm font-medium">
                Content
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleFormChange}
                  rows={5}
                  placeholder="Write your notes, code snippets, or takeaways..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </label>

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

              <label className="block text-sm font-medium">
                Resource (Optional)
                <select
                  name="resource"
                  value={form.resource}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">No resource attached</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.resource_type})
                    </option>
                  ))}
                </select>
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
                  {submitting ? "Saving..." : editingNote ? "Update Note" : "Create Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default NotesPage;
