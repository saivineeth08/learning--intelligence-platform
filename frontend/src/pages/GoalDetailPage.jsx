import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteGoal, getGoal, updateGoal } from "../services/goals";
import { getStudySessions } from "../services/studies";
import { createTask, deleteTask, getTasks, updateTask } from "../services/tasks";

function GoalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: "",
    description: "",
    category: "",
    status: "ACTIVE",
    priority: "MEDIUM",
    target_date: "",
  });

  async function loadData() {
    setError("");
    try {
      const [goalData, taskData, sessionData] = await Promise.all([
        getGoal(id),
        getTasks({ goal: id }),
        getStudySessions({ goal: id }),
      ]);
      setGoal(goalData);
      setGoalForm({
        title: goalData.title,
        description: goalData.description || "",
        category: goalData.category || "",
        status: goalData.status,
        priority: goalData.priority,
        target_date: goalData.target_date || "",
      });
      setTasks(taskData);
      setSessions(sessionData);
    } catch (err) {
      setError("Failed to load goal details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleToggleTask(task) {
    const nextStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    try {
      await updateTask(task.id, { status: nextStatus });
      await loadData();
    } catch (err) {
      setError("Failed to update task status.");
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    setSubmittingTask(true);
    setError("");
    try {
      await createTask({
        goal: parseInt(id, 10),
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        due_date: taskDueDate || null,
        status: "TODO",
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskPriority("MEDIUM");
      setTaskDueDate("");
      setShowTaskModal(false);
      await loadData();
    } catch (err) {
      setError("Failed to create task.");
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      await loadData();
    } catch (err) {
      setError("Failed to delete task.");
    }
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    try {
      await updateGoal(id, {
        ...goalForm,
        target_date: goalForm.target_date || null,
      });
      setEditingGoal(false);
      await loadData();
    } catch (err) {
      setError("Failed to update goal.");
    }
  }

  async function handleDeleteGoal() {
    if (!window.confirm("Are you sure you want to delete this goal and all associated data?")) return;
    try {
      await deleteGoal(id);
      navigate("/goals", { replace: true });
    } catch (err) {
      setError("Failed to delete goal.");
    }
  }

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalStudyMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / 60
  );

  if (loading) {
    return <p className="text-slate-600">Loading goal details...</p>;
  }

  if (!goal) {
    return (
      <div className="space-y-4">
        <p className="text-red-700">Goal not found.</p>
        <Link to="/goals" className="text-sm font-medium underline">
          &larr; Back to Goals
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/goals" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          &larr; Back to Goals
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingGoal(!editingGoal)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
          >
            {editingGoal ? "Cancel Edit" : "Edit Goal"}
          </button>
          <button
            onClick={handleDeleteGoal}
            className="rounded-md border border-red-200 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-50"
          >
            Delete Goal
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Goal Header Card */}
      {editingGoal ? (
        <form onSubmit={handleSaveGoal} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold">Edit Goal</h2>
          <label className="block text-sm font-medium">
            Title
            <input
              name="title"
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              name="description"
              value={goalForm.description}
              onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="block text-sm font-medium">
              Category
              <input
                name="category"
                value={goalForm.category}
                onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Target Date
              <input
                type="date"
                name="target_date"
                value={goalForm.target_date}
                onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Status
              <select
                name="status"
                value={goalForm.status}
                onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })}
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
                value={goalForm.priority}
                onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
          </div>
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save Changes
          </button>
        </form>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-2xl font-bold">{goal.title}</h1>
            <div className="flex gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-slate-100">
                {goal.status}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-blue-50 text-blue-700 border-blue-200">
                {goal.priority} Priority
              </span>
            </div>
          </div>

          {goal.category ? (
            <span className="inline-block text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded">
              {goal.category}
            </span>
          ) : null}

          {goal.description ? (
            <p className="text-slate-600 text-sm whitespace-pre-wrap">{goal.description}</p>
          ) : null}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-center">
            <div>
              <p className="text-xs text-slate-500 font-medium">Task Progress</p>
              <p className="text-lg font-bold mt-0.5">{completedTasks}/{tasks.length} ({progressPercent}%)</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Study Time</p>
              <p className="text-lg font-bold mt-0.5">{totalStudyMinutes} mins</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Target Date</p>
              <p className="text-lg font-bold mt-0.5">{goal.target_date || "None"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Goal Tasks</h2>
            <p className="text-sm text-slate-500">Actionable steps to achieve this goal.</p>
          </div>
          <button
            onClick={() => setShowTaskModal(true)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            + Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 italic">No tasks created for this goal yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === "COMPLETED"}
                    onChange={() => handleToggleTask(task)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <p className={`text-sm font-medium ${task.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-900"}`}>
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="text-xs text-slate-500">{task.description}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {task.due_date ? <span className="text-slate-500">Due: {task.due_date}</span> : null}
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">{task.priority}</span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Study Sessions Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Study Sessions</h2>
            <p className="text-sm text-slate-500">Logged learning sessions for this goal.</p>
          </div>
          <Link
            to="/study-sessions"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Go to Sessions &rarr;
          </Link>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 italic">No study sessions logged for this goal yet.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-3.5 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {Math.round(s.duration_seconds / 60)} minutes
                    {s.task_title ? <span className="text-xs font-normal text-slate-500 ml-2">({s.task_title})</span> : null}
                  </p>
                  <p className="text-xs text-slate-500">{new Date(s.started_at).toLocaleString()}</p>
                </div>
                {s.notes ? <p className="text-xs text-slate-600 italic max-w-xs truncate">{s.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Add Task to {goal.title}</h2>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Title *
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  placeholder="e.g. Study Binary Search"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Description
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Priority
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
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
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {submittingTask ? "Saving..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default GoalDetailPage;
