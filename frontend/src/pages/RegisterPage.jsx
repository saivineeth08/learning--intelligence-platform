import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import GoogleLoginButton from "../components/GoogleLoginButton";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

function collectErrors(data) {
  if (!data || typeof data !== "object") {
    return "Unable to register.";
  }
  if (typeof data.detail === "string") {
    return data.detail;
  }
  return Object.entries(data)
    .map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(" ") : String(messages);
      return `${field}: ${text}`;
    })
    .join(" ");
}

function RegisterPage() {
  const { register, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-500 dark:text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-2" />
        Loading session...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.password_confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await register(form);
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      setError(collectErrors(err.response?.data));
    } finally {
      setSubmitting(false);
    }
  }

  const handleGoogleSuccess = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <section className="mx-auto max-w-md space-y-6 pt-4 sm:pt-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Get started with your personalized learning workspace
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:placeholder:text-slate-500"
              name="email"
              type="email"
              placeholder="alex@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                First Name (Optional)
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:placeholder:text-slate-500"
                name="first_name"
                placeholder="Alex"
                value={form.first_name}
                onChange={handleChange}
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Last Name (Optional)
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:placeholder:text-slate-500"
                name="last_name"
                placeholder="Smith"
                value={form.last_name}
                onChange={handleChange}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <PasswordInput
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <PasswordInput
              name="password_confirm"
              value={form.password_confirm}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleLoginButton onSuccess={handleGoogleSuccess} />
      </div>

      <p className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        Already registered?{" "}
        <Link
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}

export default RegisterPage;
