import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecommendations } from "../services/ai";

const PRIORITY_STYLES = {
  HIGH: {
    badge: "bg-red-100 text-red-800 border border-red-200",
    icon: "🔴",
    card: "border-l-4 border-red-400",
  },
  MEDIUM: {
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    icon: "🟡",
    card: "border-l-4 border-amber-400",
  },
  LOW: {
    badge: "bg-slate-100 text-slate-700 border border-slate-200",
    icon: "🔵",
    card: "border-l-4 border-slate-300",
  },
};

function RecommendationCard({ rec }) {
  const style = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.LOW;
  return (
    <div className={`bg-white rounded-lg p-5 shadow-sm ${style.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}>
              {style.icon} {rec.priority}
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">{rec.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{rec.message}</p>
        </div>
        {rec.action_url && (
          <Link
            to={rec.action_url}
            className="flex-shrink-0 text-sm font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2"
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Personalised suggestions based on your current goals, tasks, and study activity.
        </p>
      </div>

      {loading && (
        <p className="text-slate-400 text-sm">Loading recommendations…</p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-green-800 font-medium">🎉 You're on track!</p>
          <p className="text-green-700 text-sm mt-1">
            No recommendations right now. Keep up the great work.
          </p>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
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
