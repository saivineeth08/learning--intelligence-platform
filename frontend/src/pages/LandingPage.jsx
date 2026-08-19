import { useEffect, useState } from "react";
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
        if (!isMounted) {
          return;
        }
        setHealth({
          status: "ok",
          message: `Backend ${data.status}. Database ${data.database}.`,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setHealth({
          status: "error",
          message:
            "The frontend is running, but it could not reach the backend health endpoint.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const statusStyles = {
    loading: "border-slate-200 bg-white text-slate-600",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Plan, track, and improve your learning
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          This is the Foundation milestone. Authentication, goals, tasks, and
          AI features will be added in later milestones.
        </p>
      </div>
      <div className={`rounded-lg border px-4 py-3 ${statusStyles[health.status]}`}>
        {health.message}
      </div>
    </section>
  );
}

export default LandingPage;
