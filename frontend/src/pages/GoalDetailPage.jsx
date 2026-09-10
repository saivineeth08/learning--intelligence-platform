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

    if (taskDueDate && goal.target_date && taskDueDate > goal.target_date) {
      setError(`Task due date (${taskDueDate}) cannot be after the goal target date (${goal.target_date}).`);
      setSubmittingTask(false);
      return;
    }

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
      const msg =
        err.response?.data?.due_date?.[0] ||
        err.response?.data?.detail ||
        "Failed to create task.";
      setError(msg);
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
    if (!window.confirm("Are you sure you want to delete this goal and all associated tasks/resources?")) return;
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
    return (
      <div className="py-20 text-center text-slate-500 dark:text-slate-400">
        Loading goal details...
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="space-y-4 text-center py-20">
        <p className="text-red-600 dark:text-red-400 font-semibold">Goal not found.</p>
        <Link to="/goals" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 underline">
          ← Back to Goals
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          to="/goals"
          className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Back to Goals
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingGoal(!editingGoal)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {editingGoal ? "Cancel Edit" : "Edit Goal"}
          </button>
          <button
            onClick={handleDeleteGoal}
            className="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete Goal
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* Goal Header Card */}
      {editingGoal ? (
        <form
          onSubmit={handleSaveGoal}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Goal</h2>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              name="title"
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
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
              value={goalForm.description}
              onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                name="category"
                value={goalForm.category}
                onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                name="target_date"
                value={goalForm.target_date}
                onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={goalForm.status}
                onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={goalForm.priority}
                onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Save Changes
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{goal.title}</h1>
            <div className="flex gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                {goal.status}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900">
                {goal.priority} Priority
              </span>
            </div>
          </div>

          {goal.category ? (
            <span className="inline-block text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 rounded-md">
              {goal.category}
            </span>
          ) : null}

          {goal.description ? (
            <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">{goal.description}</p>
          ) : null}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Task Progress</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {completedTasks}/{tasks.length} ({progressPercent}%)
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Study Time</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {totalStudyMinutes} mins
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Target Date</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {goal.target_date || "None"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Goal Tasks</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Milestones and steps to achieve this goal.</p>
          </div>
          <button
            onClick={() => setShowTaskModal(true)}
            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            + Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            No tasks created for this goal yet.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === "COMPLETED"}
                    onChange={() => handleToggleTask(task)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        task.status === "COMPLETED"
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.description}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {task.due_date ? (
                    <span className="text-slate-500 dark:text-slate-400">Due: {task.due_date}</span>
                  ) : null}
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[11px]">
                    {task.priority}
                  </span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-600 dark:text-red-400 hover:underline font-medium"
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
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Study Sessions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Logged learning sessions associated with this goal.</p>
          </div>
          <Link
            to="/study-sessions"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            All Sessions →
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
            No study sessions logged for this goal yet.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 flex justify-between items-center text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {Math.round(s.duration_seconds / 60)} minutes
                    {s.task_title ? (
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                        ({s.task_title})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 mt-0.5">
                    {new Date(s.started_at).toLocaleString()}
                  </p>
                </div>
                {s.notes ? (
                  <p className="text-slate-600 dark:text-slate-400 italic max-w-xs truncate">{s.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Add Task to {goal.title}</h2>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  placeholder="e.g. Study Graph Algorithms Chapter 2"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
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
                    value={taskDueDate}
                    max={goal.target_date || undefined}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {goal.target_date && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Max: {goal.target_date} (Goal deadline)
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60"
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
