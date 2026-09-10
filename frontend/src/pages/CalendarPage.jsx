import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchCalendarEvents } from "../services/calendar";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatSeconds(secs) {
  if (!secs) return "0m";
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDateString(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const now = new Date();
    return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Load calendar events for current month
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchCalendarEvents({
          year: currentYear,
          month: currentMonth + 1,
        });
        if (isMounted) {
          setCalendarData(data.events_by_date || {});
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load calendar events. Please try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(formatDateString(now.getFullYear(), now.getMonth(), now.getDate()));
  };

  // Build grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        dateStr: formatDateString(prevYear, prevMonth, dayNum),
        dayNum,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        dateStr: formatDateString(currentYear, currentMonth, i),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        days.push({
          dateStr: formatDateString(nextYear, nextMonth, i),
          dayNum: i,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [currentYear, currentMonth]);

  const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedEvents = calendarData[selectedDateStr] || {
    goals: [],
    tasks: [],
    studies: [],
    notes: [],
  };

  const totalSelectedActivities =
    (selectedEvents.goals?.length || 0) +
    (selectedEvents.tasks?.length || 0) +
    (selectedEvents.studies?.length || 0) +
    (selectedEvents.notes?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>📅</span> Calendar &amp; Activity
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Overview of deadlines, tasks, study records, and notes organized by date.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[120px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Main Content Grid: Calendar + Selected Date Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Calendar View (2 Cols on Desktop) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(({ dateStr, dayNum, isCurrentMonth }) => {
              const dayEvents = calendarData[dateStr] || {};
              const goalsCount = dayEvents.goals?.length || 0;
              const tasksCount = dayEvents.tasks?.length || 0;
              const studiesCount = dayEvents.studies?.length || 0;
              const notesCount = dayEvents.notes?.length || 0;
              const totalCount = goalsCount + tasksCount + studiesCount + notesCount;

              const isSelected = selectedDateStr === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`min-h-[75px] sm:min-h-[90px] rounded-xl p-2 text-left flex flex-col justify-between transition-all border ${
                    isSelected
                      ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500"
                      : isToday
                      ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-500"
                      : isCurrentMonth
                      ? "border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                      : "border-transparent text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px]"
                          : isCurrentMonth
                          ? "text-slate-800 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {totalCount > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded-full">
                        {totalCount}
                      </span>
                    )}
                  </div>

                  {/* Badges indicators */}
                  <div className="space-y-0.5 mt-1">
                    {goalsCount > 0 && (
                      <div
                        title={`${goalsCount} Goal Deadline(s)`}
                        className="truncate rounded px-1 py-0.2 text-[9px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                      >
                        🎯 {goalsCount} goal{goalsCount > 1 ? "s" : ""}
                      </div>
                    )}
                    {tasksCount > 0 && (
                      <div
                        title={`${tasksCount} Task(s)`}
                        className="truncate rounded px-1 py-0.2 text-[9px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
                      >
                        ✓ {tasksCount} task{tasksCount > 1 ? "s" : ""}
                      </div>
                    )}
                    {studiesCount > 0 && (
                      <div
                        title={`${studiesCount} Study Session(s)`}
                        className="truncate rounded px-1 py-0.2 text-[9px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                      >
                        ⏱ {studiesCount} study
                      </div>
                    )}
                    {notesCount > 0 && (
                      <div
                        title={`${notesCount} Note(s)`}
                        className="truncate rounded px-1 py-0.2 text-[9px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300"
                      >
                        📝 {notesCount} note{notesCount > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Goal Deadlines
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Tasks Due / Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Study Sessions
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Notes Created
            </span>
          </div>
        </div>

        {/* Selected Date Details Inspector (1 Col on Desktop) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Activity for {selectedDateStr}</span>
              {selectedDateStr === todayStr && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Today
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {totalSelectedActivities} total scheduled activity item{totalSelectedActivities === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">
              Loading activity...
            </div>
          ) : totalSelectedActivities === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p className="text-2xl">🌱</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">No activity recorded for this date</p>
              <p>Schedule a task or log study time to see items here.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {/* Goals */}
              {selectedEvents.goals?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <span>🎯</span> Goal Deadlines ({selectedEvents.goals.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedEvents.goals.map((g) => (
                      <Link
                        key={g.id}
                        to={`/goals/${g.id}`}
                        className="block rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/30 transition-colors shadow-2xs"
                      >
                        <p className="font-semibold text-slate-900 dark:text-white">{g.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Priority: {g.priority}</span>
                          <span>•</span>
                          <span>Status: {g.status}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {selectedEvents.tasks?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>✓</span> Tasks ({selectedEvents.tasks.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedEvents.tasks.map((t) => (
                      <Link
                        key={t.id}
                        to="/tasks"
                        className="block rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs hover:border-blue-300 dark:border-blue-900/60 dark:bg-blue-950/30 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-semibold ${t.is_completed ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                            {t.title}
                          </p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${t.is_completed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"}`}>
                            {t.status}
                          </span>
                        </div>
                        {t.goal_title && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Goal: {t.goal_title}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Sessions */}
              {selectedEvents.studies?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>⏱</span> Study Sessions ({selectedEvents.studies.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedEvents.studies.map((s) => (
                      <Link
                        key={s.id}
                        to="/study-sessions"
                        className="block rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs hover:border-emerald-300 dark:border-emerald-900/60 dark:bg-emerald-950/30 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {s.goal_title || "General Study"}
                          </p>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {formatSeconds(s.duration_seconds)}
                          </span>
                        </div>
                        {s.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic line-clamp-2">
                            &quot;{s.notes}&quot;
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedEvents.notes?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <span>📝</span> Notes Added ({selectedEvents.notes.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedEvents.notes.map((n) => (
                      <Link
                        key={n.id}
                        to="/notes"
                        className="block rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-xs hover:border-violet-300 dark:border-violet-900/60 dark:bg-violet-950/30 transition-colors shadow-2xs"
                      >
                        <p className="font-semibold text-slate-900 dark:text-white">{n.title}</p>
                        {n.goal_title && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Goal: {n.goal_title}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
