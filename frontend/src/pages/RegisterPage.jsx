import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password_confirm: "",
  });
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

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="mt-2 text-slate-600">
          Registration uses a unique email and Django password validation.
        </p>
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
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          First name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            autoComplete="given-name"
          />
        </label>
        <label className="block text-sm font-medium">
          Last name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            autoComplete="family-name"
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
            autoComplete="new-password"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Confirm password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="password_confirm"
            type="password"
            value={form.password_confirm}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-medium text-slate-900 underline" to="/login">
          Sign in
        </Link>
      </p>
    </section>
  );
}

export default RegisterPage;
