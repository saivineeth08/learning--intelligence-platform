import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecommendations } from "../services/ai";

const PRIORITY_STYLES = {
  HIGH: {
    badge: "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60",
    icon: "🔴",
    card: "border-l-4 border-red-500",
  },
  MEDIUM: {
    badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60",
    icon: "🟡",
    card: "border-l-4 border-amber-500",
  },
  LOW: {
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    icon: "🔵",
    card: "border-l-4 border-blue-500",
  },
};

function RecommendationCard({ rec }) {
  const style = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.LOW;
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 ${style.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${style.badge}`}>
              {style.icon} {rec.priority}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">{rec.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{rec.message}</p>
        </div>
        {rec.action_url && (
          <Link
            to={rec.action_url}
            className="flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2"
          >
            Go →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getRecommendations()
      .then(setData)
      .catch(() => setError("Failed to load recommendations. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const byPriority = (a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  };

  const recommendations = data?.recommendations?.slice().sort(byPriority) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Smart Recommendations</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Personalized AI suggestions based on your current goals, tasks, and study activity.
        </p>
      </div>

      {loading && (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading recommendations…</p>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-8 text-center shadow-xs">
          <p className="text-emerald-800 dark:text-emerald-300 font-bold text-base">🎉 You're completely on track!</p>
          <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-1">
            No pending recommendations right now. Keep up the great study momentum.
          </p>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
            {recommendations.length} recommendation{recommendations.length !== 1 ? "s" : ""}
          </p>
          {recommendations.map((rec, idx) => (
            <RecommendationCard key={`${rec.type}-${idx}`} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
