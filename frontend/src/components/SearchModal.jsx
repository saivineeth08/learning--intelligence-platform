import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { search } from "../services/search";

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await search(query.trim());
        setResults(data.results || []);
      } catch (err) {
        setError(err.response?.data?.error || "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  function handleSelect(url) {
    onClose();
    navigate(url);
  }

  const typeIcons = {
    goal: "🎯",
    task: "✅",
    resource: "📚",
    note: "📝",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <span className="text-slate-400 dark:text-slate-500 text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-base bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Search goals, tasks, resources, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-1 cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium ml-1 cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-3 space-y-1">
          {loading && (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">Searching...</p>
          )}
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 py-3 text-center">{error}</p>
          )}
          {!loading && query.length >= 2 && results.length === 0 && !error && (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
              No matching items found for "{query}".
            </p>
          )}
          {!loading && query.length < 2 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
              Type at least 2 characters to search across all your learning materials.
            </p>
          )}

          {results.map((item, idx) => (
            <button
              key={`${item.type}-${item.id}-${idx}`}
              onClick={() => handleSelect(item.url)}
              className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
            >
              <span className="text-lg mt-0.5">{typeIcons[item.type] || "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {item.type}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
