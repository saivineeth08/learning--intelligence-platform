import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setMessage("Profile updated.");
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

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <section className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your profile</h1>
          <p className="mt-2 text-slate-600">Signed in as {user.username}.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
        >
          Log out
        </button>
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Profile details</h2>
        <label className="block text-sm font-medium">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="email"
            type="email"
            value={profileForm.email}
            onChange={handleProfileChange}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          First name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="first_name"
            value={profileForm.first_name}
            onChange={handleProfileChange}
          />
        </label>
        <label className="block text-sm font-medium">
          Last name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="last_name"
            value={profileForm.last_name}
            onChange={handleProfileChange}
          />
        </label>
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white">
          Save profile
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="text-sm text-slate-600">
          Changing your password revokes refresh tokens. You will need to sign in again.
        </p>
        <label className="block text-sm font-medium">
          Current password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="old_password"
            type="password"
            value={passwordForm.old_password}
            onChange={handlePasswordChange}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          New password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="new_password"
            type="password"
            value={passwordForm.new_password}
            onChange={handlePasswordChange}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Confirm new password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="new_password_confirm"
            type="password"
            value={passwordForm.new_password_confirm}
            onChange={handlePasswordChange}
            required
          />
        </label>
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white">
          Change password
        </button>
      </form>
    </section>
  );
}

export default ProfilePage;
