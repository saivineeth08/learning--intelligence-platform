import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resendVerification, verifyEmail } from "../services/auth";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!uid || !token) {
      setStatus("error");
      setMessage("Verification link is missing required parameters (uid or token).");
      return;
    }

    async function handleVerify() {
      try {
        const res = await verifyEmail({ uid, token });
        setStatus("success");
        setMessage(res.detail || "Your email address has been verified successfully!");
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.token ||
            err.response?.data?.detail ||
            "Verification link is invalid or has expired."
        );
      }
    }

    handleVerify();
  }, [uid, token]);

  async function handleResend(e) {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResending(true);
    setResendMessage("");
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendMessage(res.detail || "If an account exists, a new verification email has been sent.");
    } catch (err) {
      setResendMessage("Failed to send verification email. Please try again later.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-10">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center">
        {status === "verifying" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 animate-spin">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Verifying Email...</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Please wait while we verify your verification token.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Verified!</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                Continue to Sign In
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verification Failed</h1>
            <p className="text-sm text-red-600 dark:text-red-400">{message}</p>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Request New Verification Link</h2>
              <form onSubmit={handleResend} className="mt-3 space-y-3">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="w-full rounded-lg bg-slate-900 dark:bg-slate-700 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </button>
              </form>
              {resendMessage ? (
                <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">{resendMessage}</p>
              ) : null}
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
              >
                Back to Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
