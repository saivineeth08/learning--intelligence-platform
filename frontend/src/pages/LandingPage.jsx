import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHealth } from "../services/api";

function LandingPage() {
  const [health, setHealth] = useState({
    status: "loading",
    message: "Checking backend health...",
  });

  useEffect(() => {
    let isMounted = true;

    getHealth()
      .then((data) => {
        if (!isMounted) return;
        setHealth({
          status: "ok",
          message: `Operational — API ${data.status} • DB ${data.database}`,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setHealth({
          status: "error",
          message: "Connecting to API server...",
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const features = [
    {
      icon: "🎯",
      title: "Goal & Task Planning",
      desc: "Deconstruct complex topics into milestones, prioritize tasks, and track study consistency with ease.",
    },
    {
      icon: "✨",
      title: "RAG-Powered Document Chat",
      desc: "Upload PDFs, lecture slides, and notes. Ask grounded questions with instant citations from your materials.",
    },
    {
      icon: "🧠",
      title: "AI Quiz Generator",
      desc: "Synthesize dynamic multiple-choice quizzes tailored to your uploaded resources and study goals.",
    },
    {
      icon: "⏱️",
      title: "Study Sessions & Analytics",
      desc: "Log study intervals, monitor weekly learning velocity, and gain data-driven insights into your growth.",
    },
  ];

  return (
    <div className="space-y-16 py-6 sm:py-12">
      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
          <span>🚀</span>
          <span>Next-Gen Study &amp; Learning Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          Master Any Subject with{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            AI Intelligence
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload course resources, create structured study roadmaps, generate interactive quizzes, and chat directly with your learning materials with zero hallucination.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/register"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            Get Started Free →
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Status Pill */}
        <div className="pt-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${
              health.status === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                health.status === "ok" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {health.message}
          </span>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {features.map((feat, idx) => (
          <div
            key={idx}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700 transition-all hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-2xl mb-4 group-hover:scale-110 transition-transform">
              {feat.icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feat.title}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {feat.desc}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default LandingPage;
