import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function GoogleLoginButton({ onSuccess, onError, disabled = false }) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const buttonContainerRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!googleClientId) return;

    // Load Google Identity Services script if not already loaded
    const scriptId = "google-jssdk";
    let script = document.getElementById(scriptId);

    const initializeGoogle = () => {
      if (window.google?.accounts?.id && buttonContainerRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response.credential) {
              setLoading(true);
              setErrorMessage("");
              try {
                await loginWithGoogle(response.credential);
                onSuccess?.();
              } catch (err) {
                const msg =
                  err.response?.data?.id_token ||
                  err.response?.data?.detail ||
                  "Google Sign-In failed on server.";
                setErrorMessage(msg);
                onError?.(msg);
              } finally {
                setLoading(false);
              }
            }
          },
        });

        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: "outline",
          size: "large",
          width: "100%",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
        });
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else {
      initializeGoogle();
    }
  }, [googleClientId, loginWithGoogle, onSuccess, onError]);

  if (!googleClientId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 text-center text-xs text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-600 dark:text-slate-300">Google OAuth Ready</p>
        <p className="mt-0.5 text-[11px]">
          Configure <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">VITE_GOOGLE_CLIENT_ID</code> in <code className="font-mono">.env</code> to activate one-click Google Sign-In.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div ref={buttonContainerRef} className="w-full flex justify-center min-h-[40px]" />
      {loading ? (
        <p className="text-center text-xs text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
          Authenticating with Google...
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-center text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
