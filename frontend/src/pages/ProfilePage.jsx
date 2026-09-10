import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { resendVerification } from "../services/auth";

function ProfilePage() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [resending, setResending] = useState(false);

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await updateProfile(profileForm);
      setMessage("Profile details updated successfully.");
    } catch (err) {
      setError("Unable to update profile. Check the submitted values.");
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await changePassword(passwordForm);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to change password. Confirm the current password and use a strong new password.",
      );
    }
  }

  async function handleResendVerification() {
    if (!user?.email) return;
    setResending(true);
    setResendStatus("");
    try {
      const res = await resendVerification(user.email);
      setResendStatus(res.detail || "Verification email sent.");
    } catch (err) {
      setResendStatus("Failed to send verification email.");
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Profile
            </h1>
            {user?.is_email_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                <span>✓</span> Verified Email
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                <span>⏳</span> Email Unverified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Account settings and credentials for <span className="font-semibold text-slate-900 dark:text-white">{user?.username}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-2xs transition-colors"
        >
          Sign Out
        </button>
      </div>

      {!user?.is_email_verified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs sm:text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold">Your email address has not been verified yet.</p>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-xs mt-0.5">
              Verify your ownership to ensure reliable notifications and password recoveries.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className="self-start sm:self-auto rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-500 disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend Verification Link"}
          </button>
        </div>
      )}

      {resendStatus && (
        <p className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
          {resendStatus}
        </p>
      )}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <form
          onSubmit={handleProfileSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile Information</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Update your email and personal details</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                First Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                name="first_name"
                value={profileForm.first_name}
                onChange={handleProfileChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Last Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                name="last_name"
                value={profileForm.last_name}
                onChange={handleProfileChange}
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden transition-colors"
          >
            Save Profile Details
          </button>
        </form>

        {/* Change Password Card */}
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Security &amp; Password</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Updating your password revokes existing active sessions
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <PasswordInput
              name="old_password"
              value={passwordForm.old_password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              New Password
            </label>
            <PasswordInput
              name="new_password"
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <PasswordInput
              name="new_password_confirm"
              value={passwordForm.new_password_confirm}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>
    </section>
  );
}

export default ProfilePage;
