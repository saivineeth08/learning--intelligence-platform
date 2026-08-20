import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function fieldError(error, field) {
  const value = error?.response?.data?.[field];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function LoginPage() {
  const { login, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isInitializing) {
    return <p className="text-slate-600">Loading session...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form);
      const next = location.state?.from?.pathname || "/profile";
      navigate(next, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          fieldError(err, "username") ||
          "Unable to sign in. Check your credentials.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-slate-600">Use your username and password.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <label className="block text-sm font-medium">
          Username
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        Need an account?{" "}
        <Link className="font-medium text-slate-900 underline" to="/register">
          Register
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
